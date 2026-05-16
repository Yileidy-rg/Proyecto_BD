import * as crudService from '../services/crudService.js';

export async function list(req, res, next) {
  try { res.json(await crudService.list(req.params.entity)); } catch (err) { next(err); }
}
export async function getById(req, res, next) {
  try {
    const row = await crudService.getById(req.params.entity, req.params.id);
    if (!row) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json(row);
  } catch (err) { next(err); }
}
export async function create(req, res, next) {
  try { res.status(201).json(await crudService.create(req.params.entity, req.body)); } catch (err) { next(err); }
}
export async function update(req, res, next) {
  try { res.json(await crudService.update(req.params.entity, req.params.id, req.body)); } catch (err) { next(err); }
}
export async function remove(req, res, next) {
  try { res.json(await crudService.remove(req.params.entity, req.params.id)); } catch (err) { next(err); }
}
