from odoo import models, fields, api
from odoo.osv.expression import AND

class PosSession(models.Model):
    _inherit = 'pos.session'
    

    def _load_model(self, model, write_date=None, data_id=None):
        if not write_date and not data_id:
            return super()._load_model(model)
        else:
            model_name = model.replace('.', '_')
            loader = getattr(self, '_get_pos_ui_%s' % model_name, None)
            params = getattr(self, '_loader_params_%s' %
                             # + [('write_date', '>=', write_date)]
                             model_name, None)
            if loader and params:
                new_params = params()
                domain = new_params['search_params']['domain']
                fieldss=new_params['search_params']['fields']
                if write_date:
                    domain = AND([domain, [
                        ('write_date', '>=', write_date)]])
                if data_id:
                    if isinstance(data_id,list):
                        domain = AND([domain, [
                        ('id', 'in', data_id)]])
                    else:
                        domain = AND([domain, [
                            ('id', '=', data_id)]])
                new_params['search_params']['domain'] = domain
                if 'active' not in fieldss:
                    fieldss.append('active')
                new_params['search_params']['fields'] = fieldss
                return loader(new_params)
            else:
                raise NotImplementedError(
                    _("The function to load %s has not been implemented.", model))

    def load_sync_latest_data(self, write_date=None):
        loaded_data = {}
        self = self.with_context(loaded_data=loaded_data)
        for model in [
                   
                      'loyalty.program',
                      'loyalty.rule',
                      'loyalty.reward',]:
            loaded_data[model] = self._load_model(model, write_date)
        # self._pos_data_process(loaded_data)
        return loaded_data
    
    def load_loyalty_data(self, write_date=None):
        loaded_data = {}
        self = self.with_context(loaded_data=loaded_data)
        for model in [
                      'loyalty.program',
                      'loyalty.rule',
                      'loyalty.reward',]:
            loaded_data[model] = self._load_model(model, write_date)
        # self._pos_data_process(loaded_data)
        return loaded_data

    def load_sync_reward_product(self, data_id):
        loaded_data = {}
        loaded_data['product.product'] = self._load_model(
            'product.product', write_date=None, data_id=[data_id])
        return loaded_data

    def load_updates(self, model, data_id):
        for rec in self:
            loaded_data = {}
            if data_id:
                loaded_data[model] = rec._load_model(model, write_date=None, data_id=data_id)

            # Send response for each record separately
            rec.env['bus.bus']._sendone('broadcast', f'RT_RESPONSE_{rec.id}', loaded_data)

    def build_remove(self, model, data_ids):
        loaded_data = {}
        for rec in self:
            loaded_data[model] = data_ids
        self.env['bus.bus']._sendone('broadcast', f'RT_REMOVE_{self.id}', loaded_data)

    @api.model
    def sync_data(self, model, data_id):
        session_ids = self.search([('state', '=', 'opened')])
        if session_ids:
            session_ids.load_updates(model, data_id)

    @api.model
    def remove_data(self, model, data_ids):
        session_ids = self.search([('state', '=', 'opened')])
        if session_ids:
            session_ids.build_remove(model, data_ids)


   

 
    
