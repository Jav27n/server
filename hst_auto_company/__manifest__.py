{
    'name': 'Auto-Select All Companies',
    'version': '19.0.1.0.0',
    'category': 'Technical',
    'summary': 'Automatically select all companies on login when enabled in Settings',
    'description': """
Auto-Select All Companies — streamline multi-company workflows.

Features:
- Checkbox in General Settings under Companies section
- When enabled, all allowed companies are auto-selected on login
- When disabled, normal Odoo behavior (only default company selected)
- Seamless integration with Odoo's native company switcher
- Lightweight — runs once on page load, no performance impact
    """,
    'author': 'HSxTECH',
    'license': 'LGPL-3',
    'depends': ['base_setup'],
    'data': [
        'views/res_config_settings_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'hst_auto_company/static/src/js/auto_company.js',
        ],
    },
    'images': [
        'static/description/banner.gif',
        'static/description/icon.png',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
