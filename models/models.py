from odoo import models, fields, api,_
from odoo.exceptions import  UserError

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    @api.model
    def create(self, vals):
        result = super().create(vals)
        if result.product_variant_ids:
            self.env['pos.session'].sync_data(
                result.product_variant_ids._name, result.product_variant_ids.ids)

        return result

    def write(self, vals):
        result = super().write(vals)
        if self.product_variant_ids:
            self.env['pos.session'].sync_data(
                self.product_variant_ids._name, self.product_variant_ids.ids)
        return result

    def unlink(self):
        product_variant_ids = self.product_variant_ids
        ids = []
        name = ''
        if product_variant_ids:
            ids = product_variant_ids.ids
            name = product_variant_ids._name
        result = super().unlink()
        if ids:
            self.env['pos.session'].remove_data(name, ids)
        return result


class Product(models.Model):
    _inherit = 'product.product'

    write_date = fields.Datetime(
        'Last Updated on',  index=True, help="Date on which the record was last updated.")

    @api.model
    def create(self, vals):
        result = super().create(vals)
        self.env['pos.session'].sync_data(self._name, result.ids)
        return result

    def write(self, vals):
        result = super().write(vals)
        self.env['pos.session'].sync_data(self._name, self.ids)
        return result

    def unlink(self):
        ids = self.ids
        result = super().unlink()
        self.env['pos.session'].remove_data(self._name, ids)
        return result


class LoyaltyProgram(models.Model):
    _inherit = 'loyalty.program'

    write_date = fields.Datetime(
        'Last Updated on',  index=True, help="Date on which the record was last updated.")

    @api.model
    def create(self, vals):
        result = super().create(vals)
        self.env['pos.session'].sync_data(self._name, result.ids)
        return result

    def write(self, vals):
        if 'active' in vals and not vals.get('active', False) or ('pos_ok' in vals and not vals.get('pos_ok')):
            if 'date_to' in vals and vals.get('date_to') and fields.Date.to_date(vals.get('date_to')) >= fields.Date.today():
                raise UserError(_('You can not Archive or remove from POS a program that is still valid'))
            elif 'date_to' in vals and not vals.get('date_to'):
                raise UserError(_('You can not Archive or remove from POS a program that is still valid'))
            elif not 'date_to' in vals and not self.date_to:
                raise UserError(_('You can not Archive or remove from POS a program that is still valid'))
            elif not 'date_to' in vals and self.date_to and self.date_to >= fields.Date.today():
                raise UserError(_('You can not Archive or remove from POS a program that is still valid'))
        result = super().write(vals)
        self.env['pos.session'].sync_data(self._name, self.ids)
        return result

    def unlink(self):
        ids = self.ids
        result = super().unlink()
        self.env['pos.session'].remove_data(self._name, ids)
        return result

class LoyaltyRule(models.Model):
    _inherit = 'loyalty.rule'

    write_date = fields.Datetime(
        'Last Updated on',  index=True, help="Date on which the record was last updated.")

    @api.model
    def create(self, vals):
        result = super().create(vals)
        self.env['pos.session'].sync_data(self._name, result.ids)
        return result

    def write(self, vals):
        result = super().write(vals)
        self.env['pos.session'].sync_data(self._name, self.ids)
        return result

    def unlink(self):
        ids = self.ids
        result = super().unlink()
        self.env['pos.session'].remove_data(self._name, ids)
        return result


class LoyaltyReward(models.Model):
    _inherit = 'loyalty.reward'

    write_date = fields.Datetime(
        'Last Updated on',  index=True, help="Date on which the record was last updated.")

    @api.model
    def create(self, vals):
        result = super().create(vals)
        self.env['pos.session'].sync_data(self._name, result.ids)
        return result

    def write(self, vals):
        result = super().write(vals)
        self.env['pos.session'].sync_data(self._name, self.ids)
        return result
    def unlink(self):
        ids = self.ids
        result = super().unlink()
        self.env['pos.session'].remove_data(self._name, ids)
        return result
