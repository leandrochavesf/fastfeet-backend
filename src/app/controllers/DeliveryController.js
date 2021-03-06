import * as Yup from 'yup';
import { startOfHour, parseISO, isAfter, isBefore, getHours } from 'date-fns';
import Delivery from '../models/Delivery';
import File from '../models/File';

class DeliveryController {
  async index(req, res) {
    /** CHECK TYPES OF BODY */
    const schema = Yup.object().shape({
      page: Yup.number(),
    });

    // TODO: RETORNAR ERROS DE VALIDAÇAO MAIS ESPECIFICOS
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { page = 1 } = req.body;

    const deliveryData = await Delivery.findAll({
      where: { canceled_at: null },
      order: [['start_date', 'DESC']],
      attributes: [
        'id',
        'recipient_id',
        'deliveryman_id',
        'product',
        'canceled_at',
        'start_date',
        'end_date',
      ],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: File,
          as: 'signature',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.status(200).json(deliveryData);
  }

  async store(req, res) {
    /** CHECK TYPES OF BODY */
    // TODO: AVALIAR OS CAMPOS NOTREQUIRED SE SERAO NECESSARIOS AQUI
    const schema = Yup.object().shape({
      recipient_id: Yup.number().required(),
      deliveryman_id: Yup.number().required(),
      product: Yup.string().required(),
      signature_id: Yup.number().notRequired(),
      canceled_at: Yup.date().notRequired(),
      start_date: Yup.date().notRequired(),
      end_date: Yup.date().notRequired(),
    });

    // TODO: RETORNAR ERROS DE VALIDAÇAO MAIS ESPECIFICOS
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    /** DESTRUCTURING */
    const { recipient_id, deliveryman_id, product } = req.body;

    /** SAVE DELIVERY IN BD */
    const deliveryData = await Delivery.create({
      recipient_id,
      deliveryman_id,
      product,
    });

    // TODO: NOTIFICAR O DELIVERYMAN COM EMAIL E DETALHES DA ENCOMENDA

    // TODO: RETORNAR APENAS DADOS NECESSARIOS
    return res.status(201).json(deliveryData);
  }

  async update(req, res) {
    /** CHECK TYPES OF BODY */
    const schema = Yup.object().shape({
      recipient_id: Yup.number(),
      deliveryman_id: Yup.number(),
      product: Yup.string(),
      signature_id: Yup.number(),
      canceled_at: Yup.date(),
      start_date: Yup.date(),
      end_date: Yup.date(),
    });

    // TODO: RETORNAR ERROS DE VALIDAÇAO MAIS ESPECIFICOS
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    /** DESTRUCTURING */
    const {
      recipient_id,
      deliveryman_id,
      product,
      signature_id,
      start_date,
      end_date,
      canceled_at,
    } = req.body;
    const { id } = req.params;

    const delivery = await Delivery.findByPk(id);

    if (start_date) {
      /**
       * Check for past dates
       */
      const hourStart = startOfHour(parseISO(start_date));
      if (isBefore(hourStart, new Date())) {
        return res.status(400).json({ error: 'Past dates are not permitted' });
      }

      /**
       * Check start_date for dates before 08:00
       */
      if (isBefore(start_date, new Date().setHours(8, 0, 0, 0))) {
        return res.status(400).json({
          error: 'Its only permitted start_date between 08:00 and 18h:00',
        });
      }

      /**
       * Check start_date for dates after 18:00
       */
      if (getHours(start_date) >= 18) {
        return res.status(400).json({
          error: "It's not permitted start_date after 18h:00",
        });
      }
    }

    /**
     * Check if end_date is before start_date
     */
    if (end_date && isAfter(end_date, start_date)) {
      return res.status(400).json({
        error: "It's not permitted end_date before start_date",
      });
    }

    /**
     * Check if its not possible to cancel delivery
     */
    if (canceled_at && delivery.end_date) {
      return res.status(400).json({
        error:
          "It's not permitted cancel delivery because it has already been completed ",
      });
    }

    /**
     * Update Delivery on BD
     */
    const deliveryData = await delivery.update({
      recipient_id,
      deliveryman_id,
      product,
      signature_id,
      start_date,
      end_date,
      canceled_at,
    });

    // TODO: NOTIFICAR O DELIVERYMAN COM EMAIL E DETALHES DA ENCOMENDA

    // TODO: RETORNAR APENAS DADOS NECESSARIOS
    return res.status(200).json(deliveryData);
  }

  async delete(req, res) {
    const { id } = req.params;

    const deliveryData = await Delivery.findByPk(id);

    if (!deliveryData) {
      res.status(400).json({ error: 'Delivery not found' });
    }

    await deliveryData.destroy();

    return res.status(200).json();
  }
}

export default new DeliveryController();
