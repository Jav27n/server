from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    auto_select_all_companies = fields.Boolean(
        string="Auto-Select All Companies on Login",
        config_parameter='hst_auto_company.auto_select_all',
        help="When enabled, all allowed companies are automatically selected for users on login.",
    )
