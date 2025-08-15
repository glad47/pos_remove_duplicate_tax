from odoo import models, api


class LoyaltyReward(models.Model):
    _inherit = 'loyalty.reward'

    @api.model
    def compute_all_discount_product_ids(self):
        for reward in self:
            compute_all_discount_product = self.env['ir.config_parameter'].sudo().get_param(
                'loyalty.compute_all_discount_product_ids', 'enabled'
            )
            if compute_all_discount_product == 'enabled':
                reward.all_discount_product_ids = self.env['product.product'].search(
                    reward._get_discount_product_domain()
                )
            else:
                reward.all_discount_product_ids = self.env['product.product']

    
