# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, api, models
from odoo.exceptions import UserError

class LoyaltyProgram(models.Model):
    _inherit = 'loyalty.program'


    def write(self, vals):
        if 'active' in vals and vals['active'] is False:
            for program in self:
                for rule in program.rule_ids:
                    for product in rule.valid_product_ids:
                        if product and product.available_in_pos:
                            raise UserError(_(
                                'You cannot archive the loyalty program "%s" because the reward product "%s" is still available in POS.'
                            ) % (program.name, product.display_name))
        return super().write(vals)

   