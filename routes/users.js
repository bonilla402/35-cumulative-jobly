"use strict";

/** Routes for users. */

const jsonschema = require("jsonschema");

const express = require("express");
const { ensureLoggedIn } = require("../middleware/auth");
const { ensureAdmin } = require("../middleware/auth");
const { ensureAdminOrSelf } = require("../middleware/auth");

const { BadRequestError } = require("../expressError");
const User = require("../models/user");
const { createToken } = require("../helpers/tokens");
const userNewSchema = require("../schemas/userNew.json");
const userUpdateSchema = require("../schemas/userUpdate.json");

const router = express.Router();


/** POST / { user }  => { user, token }
 *
 * Adds a new user. This is not the registration endpoint --- instead, this is
 * only for admin users to add new users. The new user being added can be an
 * admin.
 *
 * This returns the newly created user and an authentication token for them:
 *  {user: { username, firstName, lastName, email, isAdmin }, token }
 *
 * Authorization required: admin
 **/

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.register(req.body);
    const token = createToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    return next(err);
  }
});


/** GET / => { users: [ {username, firstName, lastName, email }, ... ] }
 *
 * Returns list of all users.
 *
 * Authorization required: admin
 **/

router.get("/", ensureAdmin, async function (req, res, next) {
  try {
    const users = await User.findAll();
    return res.json({ users });
  } catch (err) {
    return next(err);
  }
});


/** GET /[username] => { user }
 *
 * Returns { username, firstName, lastName, isAdmin }
 *
 * Authorization required: login
 **/

router.get("/:username", ensureAdminOrSelf, async function (req, res, next) {
  try {
    const user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** PATCH /[username] { user } => { user }
 *
 * Data can include:
 *   { firstName, lastName, password, email }
 *
 * Returns { username, firstName, lastName, email, isAdmin }
 *
 * Authorization required: login
 **/

router.patch("/:username", ensureAdminOrSelf, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, userUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const user = await User.update(req.params.username, req.body);
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});


/** DELETE /[username]  =>  { deleted: username }
 *
 * Authorization required: login
 **/

router.delete("/:username", ensureAdminOrSelf, async function (req, res, next) {
  try {
    await User.remove(req.params.username);
    return res.json({ deleted: req.params.username });
  } catch (err) {
    return next(err);
  }
});


/**
 * POST /:username/jobs/:id
 *
 * Apply a user to a specific job.
 *
 * This route allows a user to apply to a job by inserting a record into the applications table.
 * The user must be either the correct user (as per the username in the URL) or an admin to access this route.
 *
 * Route parameters:
 * @param {string} username - The username of the user applying for the job.
 * @param {number} id - The ID of the job to which the user is applying.
 *
 * Middleware:
 * - ensureCorrectUserOrAdmin: Verifies that the user is either the correct user or an admin.
 *
 * Request body: None
 *
 * Response:
 * - Status: 200 OK
 * - Body: { applied: jobId }
 *
 * @throws {NotFoundError} If the job with the specified ID does not exist.
 * @throws {NotFoundError} If the user with the specified username does not exist.
 * @throws {Error} For any other errors that might occur during the application process.
 *
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
router.post("/:username/jobs/:id", ensureAdminOrSelf, async function (req, res, next) {
  try {
    const jobId = +req.params.id;
    await User.applyToJob(req.params.username, jobId);
    return res.json({ applied: jobId });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
