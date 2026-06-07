const { body, param, query, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(400).json({
    error: 'Payload invalido',
    errors: result.array().map((err) => ({
      field: err.path,
      location: err.location,
      message: err.msg,
      value: err.value,
    })),
  });
}

function idParam(name = 'id') {
  return param(name)
    .isInt({ min: 1 })
    .withMessage(`${name} debe ser un entero positivo`)
    .toInt();
}

function optionalIdBody(name) {
  return body(name)
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage(`${name} debe ser un entero positivo`)
    .toInt();
}

function requiredIdBody(name) {
  return body(name)
    .exists({ checkFalsy: true })
    .withMessage(`${name} es requerido`)
    .bail()
    .isInt({ min: 1 })
    .withMessage(`${name} debe ser un entero positivo`)
    .toInt();
}

function optionalMoneyBody(name, { min = 0 } = {}) {
  return body(name)
    .optional({ nullable: true })
    .isFloat({ min })
    .withMessage(`${name} debe ser un monto mayor o igual a ${min}`)
    .toFloat();
}

function requiredPositiveMoneyBody(name) {
  return body(name)
    .exists({ checkFalsy: true })
    .withMessage(`${name} es requerido`)
    .bail()
    .isFloat({ gt: 0 })
    .withMessage(`${name} debe ser un monto mayor a cero`)
    .toFloat();
}

function optionalDateBody(name) {
  return body(name)
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601({ strict: true })
    .withMessage(`${name} debe ser una fecha valida en formato ISO`);
}

function optionalNonEmptyBody(name, { max = 255 } = {}) {
  return body(name)
    .optional({ nullable: true })
    .trim()
    .notEmpty()
    .withMessage(`${name} no puede estar vacio`)
    .bail()
    .isLength({ max })
    .withMessage(`${name} no puede superar ${max} caracteres`);
}

function requiredNonEmptyBody(name, { max = 255 } = {}) {
  return body(name)
    .exists({ checkFalsy: true })
    .withMessage(`${name} es requerido`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${name} no puede estar vacio`)
    .bail()
    .isLength({ max })
    .withMessage(`${name} no puede superar ${max} caracteres`);
}

function cedulaBody(name = 'cedula', { required = true } = {}) {
  const chain = body(name);
  const validator = required
    ? chain.exists({ checkFalsy: true }).withMessage(`${name} es requerida`).bail()
    : chain.optional({ nullable: true, checkFalsy: true });

  return validator
    .trim()
    .matches(/^[0-9A-Za-z-]{9,20}$/)
    .withMessage(`${name} debe tener entre 9 y 20 caracteres alfanumericos`);
}

function optionalBooleanBody(name) {
  return body(name)
    .optional({ nullable: true })
    .isBoolean()
    .withMessage(`${name} debe ser booleano`)
    .toBoolean();
}

function optionalIntBody(name, { min = 1, max } = {}) {
  return body(name)
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min, max })
    .withMessage(`${name} debe ser un entero valido`)
    .toInt();
}

function requiredIntBody(name, { min = 1, max } = {}) {
  return body(name)
    .exists({ checkFalsy: true })
    .withMessage(`${name} es requerido`)
    .bail()
    .isInt({ min, max })
    .withMessage(`${name} debe ser un entero valido`)
    .toInt();
}

function optionalIntQuery(name, { min = 1, max } = {}) {
  return query(name)
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min, max })
    .withMessage(`${name} debe ser un entero valido`)
    .toInt();
}

function optionalNonEmptyQuery(name, { max = 255 } = {}) {
  return query(name)
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage(`${name} no puede estar vacio`)
    .bail()
    .isLength({ max })
    .withMessage(`${name} no puede superar ${max} caracteres`);
}

module.exports = {
  body,
  param,
  query,
  handleValidation,
  idParam,
  optionalIdBody,
  requiredIdBody,
  optionalMoneyBody,
  requiredPositiveMoneyBody,
  optionalDateBody,
  optionalNonEmptyBody,
  requiredNonEmptyBody,
  cedulaBody,
  optionalBooleanBody,
  optionalIntBody,
  requiredIntBody,
  optionalIntQuery,
  optionalNonEmptyQuery,
};
