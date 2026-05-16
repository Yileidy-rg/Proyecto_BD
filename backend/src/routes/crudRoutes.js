import { Router } from 'express';
import * as controller from '../controllers/crudController.js';

const router = Router();

router.get('/:entity', controller.list);
router.get('/:entity/:id', controller.getById);
router.post('/:entity', controller.create);
router.put('/:entity/:id', controller.update);
router.delete('/:entity/:id', controller.remove);

export default router;
