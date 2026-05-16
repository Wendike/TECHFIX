const DeliveryModel = require('../models/DeliveryModel');

const statusOptions = [
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelada' }
];

const statusLabels = {
  delivered: 'Entregue',
  cancelled: 'Cancelada'
};

const statusClasses = {
  delivered: 'badge-success',
  cancelled: 'badge-danger'
};

class DeliveryController {
  static async index(req, res) {
    try {
      const deliveries = await DeliveryModel.findAll();

      return res.render('pages/deliveries/index', {
        title: 'Entregas',
        deliveries,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar entregas.');
      return res.redirect('/');
    }
  }

  static async create(req, res) {
    try {
      const devices = await DeliveryModel.findAvailableDevices();

      return res.render('pages/deliveries/create', {
        title: 'Nova Entrega',
        devices,
        statusOptions,
        selectedDeviceId: req.query.device_id || ''
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir cadastro de entrega.');
      return res.redirect('/deliveries');
    }
  }

  static async store(req, res) {
    try {
      const {
        device_id,
        received_by_name,
        notes,
        delivery_date,
        status
      } = req.body;

      if (!device_id || !received_by_name) {
        req.flash('error', 'Dispositivo e nome de quem retirou são obrigatórios.');
        return res.redirect('/deliveries/create');
      }

      await DeliveryModel.create({
        device_id,
        received_by_name,
        notes,
        delivery_date,
        status,
        delivered_by: req.session.user.id
      });

      req.flash('success', 'Entrega registrada com sucesso. O dispositivo foi marcado como entregue.');
      return res.redirect('/deliveries');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao registrar entrega.');
      return res.redirect('/deliveries/create');
    }
  }

  static async show(req, res) {
    try {
      const delivery = await DeliveryModel.findById(req.params.id);

      if (!delivery) {
        req.flash('error', 'Entrega não encontrada.');
        return res.redirect('/deliveries');
      }

      return res.render('pages/deliveries/show', {
        title: 'Detalhes da Entrega',
        delivery,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar entrega.');
      return res.redirect('/deliveries');
    }
  }

  static async edit(req, res) {
    try {
      const delivery = await DeliveryModel.findById(req.params.id);

      if (!delivery) {
        req.flash('error', 'Entrega não encontrada.');
        return res.redirect('/deliveries');
      }

      return res.render('pages/deliveries/edit', {
        title: 'Editar Entrega',
        delivery,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição da entrega.');
      return res.redirect('/deliveries');
    }
  }

  static async update(req, res) {
    try {
      const {
        received_by_name,
        notes,
        delivery_date,
        status
      } = req.body;

      if (!received_by_name) {
        req.flash('error', 'Informe o nome de quem retirou o dispositivo.');
        return res.redirect(`/deliveries/${req.params.id}/edit`);
      }

      await DeliveryModel.update(req.params.id, {
        received_by_name,
        notes,
        delivery_date,
        status
      });

      req.flash('success', 'Entrega atualizada com sucesso.');
      return res.redirect('/deliveries');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao atualizar entrega.');
      return res.redirect(`/deliveries/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const { status } = req.body;
      const allowed = statusOptions.map((item) => item.value);

      if (!allowed.includes(status)) {
        req.flash('error', 'Status inválido.');
        return res.redirect('/deliveries');
      }

      await DeliveryModel.updateStatus(req.params.id, status);

      req.flash('success', 'Status da entrega atualizado com sucesso.');
      return res.redirect('/deliveries');
    } catch (error) {
      console.error(error);
      req.flash('error', error.message || 'Erro ao alterar status da entrega.');
      return res.redirect('/deliveries');
    }
  }
}

module.exports = DeliveryController;
