from odoo import models, api


class IrHttp(models.AbstractModel):
    _inherit = 'ir.http'

    @api.model
    def session_info(self):
        result = super().session_info()
        auto_select = self.env['ir.config_parameter'].sudo().get_param(
            'hst_auto_company.auto_select_all', 'False'
        )
        result['auto_select_all_companies'] = auto_select == 'True'
        return result
