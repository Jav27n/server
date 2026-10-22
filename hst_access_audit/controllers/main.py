from odoo import http
from odoo.http import request


class HSTAccessAudit(http.Controller):

    @http.route('/hst_access_audit/data', type='json', auth='user')
    def get_dashboard_data(self, search='', **kwargs):
        """Return user-centric access audit data."""
        if not request.env.user.has_group('base.group_system'):
            return {'error': 'Access Denied'}

        User = request.env['res.users'].sudo()
        Group = request.env['res.groups'].sudo()

        all_users = User.with_context(active_test=False).search([
            ('share', '=', False),
        ])
        active_users = all_users.filtered('active')
        inactive_users = all_users - active_users

        portal_users = User.with_context(active_test=False).search([
            ('share', '=', True),
        ])

        all_groups = Group.search([])

        # ---- KPIs ----
        admin_group = request.env.ref('base.group_system', raise_if_not_found=False)
        admin_count = len(admin_group.users) if admin_group else 0

        kpis = {
            'total_internal': len(active_users),
            'inactive_users': len(inactive_users),
            'portal_users': len(portal_users),
            'admin_count': admin_count,
            'total_groups': len(all_groups),
        }

        # ---- Users by App/Category (for chart) ----
        category_data = {}
        for grp in all_groups:
            cat_name = grp.category_id.name if grp.category_id else 'Other'
            if cat_name not in category_data:
                category_data[cat_name] = set()
            for u in grp.users:
                if u.active and not u.share:
                    category_data[cat_name].add(u.id)
        users_by_app = sorted(
            [{'name': k, 'count': len(v)} for k, v in category_data.items()],
            key=lambda x: -x['count'],
        )[:15]

        # ---- Top Groups by User Count (for chart) ----
        top_groups = []
        for grp in all_groups:
            internal_count = len(grp.users.filtered(
                lambda u: u.active and not u.share))
            if internal_count > 0:
                top_groups.append({
                    'id': grp.id,
                    'name': grp.full_name,
                    'count': internal_count,
                })
        top_groups.sort(key=lambda x: -x['count'])
        top_groups = top_groups[:15]

        # ---- User Table with their groups ----
        user_list = []
        target_users = active_users
        if search:
            search_lower = search.lower()
            target_users = target_users.filtered(
                lambda u: search_lower in (u.name or '').lower()
                or search_lower in (u.login or '').lower())

        for user in target_users[:100]:
            groups = user.groups_id
            group_names = []
            app_access = set()
            for g in groups:
                group_names.append(g.full_name)
                if g.category_id:
                    app_access.add(g.category_id.name)

            is_admin = admin_group and admin_group in groups
            user_list.append({
                'id': user.id,
                'name': user.name,
                'login': user.login,
                'email': user.email or '',
                'is_admin': is_admin,
                'active': user.active,
                'group_count': len(groups),
                'app_access': sorted(app_access),
                'groups': sorted(group_names),
                'company': user.company_id.name if user.company_id else '',
            })
        user_list.sort(key=lambda x: (-x['group_count'], x['name']))

        # ---- Admin Users (highlight) ----
        admin_users = []
        if admin_group:
            for u in admin_group.users.filtered('active'):
                admin_users.append({
                    'id': u.id,
                    'name': u.name,
                    'login': u.login,
                    'email': u.email or '',
                })

        # ---- Recently Created Users (last 30 days) ----
        from datetime import timedelta
        from odoo import fields
        cutoff = fields.Datetime.now() - timedelta(days=30)
        recent_users = User.search([
            ('create_date', '>=', cutoff),
            ('share', '=', False),
            ('active', '=', True),
        ], order='create_date desc', limit=10)
        recent_list = []
        for u in recent_users:
            recent_list.append({
                'id': u.id,
                'name': u.name,
                'login': u.login,
                'create_date': fields.Datetime.to_string(u.create_date),
                'group_count': len(u.groups_id),
            })

        return {
            'kpis': kpis,
            'users_by_app': users_by_app,
            'top_groups': top_groups,
            'user_list': user_list,
            'admin_users': admin_users,
            'recent_users': recent_list,
        }
