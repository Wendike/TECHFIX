const DeviceModel = require('../models/DeviceModel');

const statusOptions = [
  { value: 'received', label: 'Recebido' },
  { value: 'diagnosis', label: 'Diagnóstico' },
  { value: 'waiting_approval', label: 'Aguardando aprovação' },
  { value: 'repairing', label: 'Em reparo' },
  { value: 'waiting_parts', label: 'Aguardando peças' },
  { value: 'repaired', label: 'Reparado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' }
];

const statusLabels = {
  received: 'Recebido',
  diagnosis: 'Diagnóstico',
  waiting_approval: 'Aguardando aprovação',
  repairing: 'Em reparo',
  waiting_parts: 'Aguardando peças',
  repaired: 'Reparado',
  delivered: 'Entregue',
  cancelled: 'Cancelado'
};

const statusClasses = {
  received: 'badge-role',
  diagnosis: 'badge-warning',
  waiting_approval: 'badge-warning',
  repairing: 'badge-role',
  waiting_parts: 'badge-warning',
  repaired: 'badge-success',
  delivered: 'badge-success',
  cancelled: 'badge-danger'
};

class DeviceController {
  static async index(req, res) {
    try {
      const devices = await DeviceModel.findAll();

      return res.render('pages/devices/index', {
        title: 'Dispositivos',
        devices,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar dispositivos.');
      return res.redirect('/');
    }
  }

  static async create(req, res) {
    try {
      const clients = await DeviceModel.findActiveClients();

      return res.render('pages/devices/create', {
        title: 'Entrada de Dispositivo',
        clients,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir entrada de dispositivo.');
      return res.redirect('/devices');
    }
  }

  static async store(req, res) {
    try {
      const {
        client_id,
        device_type,
        brand,
        model,
        serial_number,
        problem_description,
        accessories,
        password_or_pin,
        physical_condition,
        status
      } = req.body;

      if (!client_id || !device_type || !problem_description) {
        req.flash('error', 'Cliente, tipo do dispositivo e defeito relatado são obrigatórios.');
        return res.redirect('/devices/create');
      }

      await DeviceModel.create({
        client_id,
        created_by: req.session.user.id,
        device_type,
        brand,
        model,
        serial_number,
        problem_description,
        accessories,
        password_or_pin,
        physical_condition,
        status
      });

      req.flash('success', 'Dispositivo registrado com sucesso.');
      return res.redirect('/devices');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao registrar dispositivo.');
      return res.redirect('/devices/create');
    }
  }

  static async show(req, res) {
    try {
      const device = await DeviceModel.findById(req.params.id);

      if (!device) {
        req.flash('error', 'Dispositivo não encontrado.');
        return res.redirect('/devices');
      }

      return res.render('pages/devices/show', {
        title: 'Detalhes do Dispositivo',
        device,
        statusOptions,
        statusLabels,
        statusClasses
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao carregar dispositivo.');
      return res.redirect('/devices');
    }
  }

  static async edit(req, res) {
    try {
      const device = await DeviceModel.findById(req.params.id);

      if (!device) {
        req.flash('error', 'Dispositivo não encontrado.');
        return res.redirect('/devices');
      }

      const clients = await DeviceModel.findActiveClients();

      return res.render('pages/devices/edit', {
        title: 'Editar Dispositivo',
        device,
        clients,
        statusOptions
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao abrir edição do dispositivo.');
      return res.redirect('/devices');
    }
  }

  static async update(req, res) {
    try {
      const {
        client_id,
        device_type,
        brand,
        model,
        serial_number,
        problem_description,
        accessories,
        password_or_pin,
        physical_condition,
        status
      } = req.body;

      const device = await DeviceModel.findById(req.params.id);

      if (!device) {
        req.flash('error', 'Dispositivo não encontrado.');
        return res.redirect('/devices');
      }

      if (!client_id || !device_type || !problem_description) {
        req.flash('error', 'Cliente, tipo do dispositivo e defeito relatado são obrigatórios.');
        return res.redirect(`/devices/${req.params.id}/edit`);
      }

      await DeviceModel.update(req.params.id, {
        client_id,
        device_type,
        brand,
        model,
        serial_number,
        problem_description,
        accessories,
        password_or_pin,
        physical_condition,
        status
      });

      req.flash('success', 'Dispositivo atualizado com sucesso.');
      return res.redirect('/devices');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao atualizar dispositivo.');
      return res.redirect(`/devices/${req.params.id}/edit`);
    }
  }

  static async changeStatus(req, res) {
    try {
      const { status } = req.body;

      const device = await DeviceModel.findById(req.params.id);

      if (!device) {
        req.flash('error', 'Dispositivo não encontrado.');
        return res.redirect('/devices');
      }

      const allowedStatus = statusOptions.map((item) => item.value);

      if (!allowedStatus.includes(status)) {
        req.flash('error', 'Status inválido.');
        return res.redirect('/devices');
      }

      await DeviceModel.updateStatus(req.params.id, status);

      req.flash('success', 'Status do dispositivo atualizado com sucesso.');
      return res.redirect('/devices');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Erro ao alterar status do dispositivo.');
      return res.redirect('/devices');
    }
  }
}

module.exports = DeviceController;
