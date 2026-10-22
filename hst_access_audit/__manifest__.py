{
    'name': 'HST Model Access Audit',
    'version': '19.0.1.0.0',
    'category': 'Technical',
    'summary': 'Audit dashboard for model access rights, record rules, '
               'and security groups',
    'description': """
HST Model Access Audit for Odoo 19
=====================================

A security audit dashboard for administrators.

Features:
---------
* **KPI Cards** - Total Models, Models without ACL, Models without
  Record Rules, Total Groups.
* **Missing ACL Table** - Models that have NO access rules defined
  (security risk).
* **Full Access Matrix** - Every model with its access rules per group
  (Read/Write/Create/Delete).
* **Record Rules Overview** - All record rules with model, groups,
  domain, and permissions.
* **Group Permissions** - Each group with its member count, ACL count,
  and rule count.
* **Search & Filter** - Search by model name, filter by status.
* **Drag & Drop + Free Resize** panels.
    """,
    'author': 'HSxTECH',
    'website': 'https://www.hsxtech.net',
    'license': 'LGPL-3',
    'depends': [
        'base',
    ],
    'data': [
        'views/dashboard_action.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'hst_access_audit/static/src/scss/dashboard.scss',
            'hst_access_audit/static/src/xml/dashboard.xml',
            'hst_access_audit/static/src/js/dashboard.js',
            # 'hst_access_audit/views/dashboard_action.xml',
        ],
    },
    'images': ['static/description/icon.png'],
    'installable': True,
    'application': False,
    'auto_install': False,
}
