# -*- coding: utf-8 -*-
{
    'name': 'Chatter Resizer Backend',
    'summary': 'Resizable backend chatter panel for Odoo 19',
    'description': '''
Chatter Resize adds a draggable resize handle to the Odoo backend chatter panel.
You can set your chatter with some simple drags.
    ''',
    'version': '19.0.1.0.9',
    'category': 'Productivity',
    'author': 'HSxTECH',
    'website': 'https://www.hsxtech.net',
    'license': 'LGPL-3',
    'depends': ['web', 'mail'],
    'data': ['views/menu.xml'],
    'assets': {
        'web.assets_backend': [
            'hst_chatter_resize/static/src/js/chatter_resize.js',
        ],
    },
    'images': [
        'static/description/banner.gif',
        'static/description/icon.png',
    ],
    'application': True,
    'installable': True,
    'auto_install': False,
}
