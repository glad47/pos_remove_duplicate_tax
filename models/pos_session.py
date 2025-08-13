from odoo import models, fields, api

class PosSession(models.Model):
    _inherit = 'pos.session'

    def load_pos_loyalty_data(self):
        
        loyalty_models = [
            'loyalty.program',
            'loyalty.rule',
            'loyalty.reward',
        ]

        loaded_data_loyalty = {}
        self = self.with_context(loaded_data_loyalty=loaded_data_loyalty)

        for model in loyalty_models:
            loaded_data_loyalty[model] = self._load_model(model)

        # Optional: process only loyalty data if needed
        
        # self._pos_data_process(loaded_data_loyalty)

        return loaded_data_loyalty

 
    
