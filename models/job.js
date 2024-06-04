"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {

  /** Create a job (from data), update db, return new job data.
   *
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   * */

  static async create({ companyHandle, title, salary, equity }) {
    const result = await db.query(
      `INSERT INTO jobs (title,
                         salary,
                         equity,
                         company_handle)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
    [
      title,
      salary,
      equity,
      companyHandle,
    ]);

    const job = result.rows[0];

    return job;
  }

/**
 * Finds companies based on optional filters.
 * @param {string} name - (Optional) Name of the company to filter by.
 * @param {number} minEmployees - (Optional) Minimum number of employees a company should have.
 * @param {number} maxEmployees - (Optional) Maximum number of employees a company should have.
 * @returns {[{ id, title, salary, equity, companyHandle, companyName }, ...]} An array of objects representing the companies that match the provided filters.
 */
static async findAll(minSalary, hasEquity, title) {
  let values = [];
  let filters = [];

  // Construct filters based on provided parameters
  if (title) {
    values.push(title);
    filters.push(`title ILIKE '%' ||$${values.length} || '%'`); // Add filter for title
  }
  if (minSalary) {
    values.push(minSalary);
    filters.push(`salary >= $${values.length}`); // Add filter for minimum salary
  }
  if (hasEquity) {
    filters.push(`equity > 0 `); // Add filter for maximum number of employees
  }

  let concatenatedFilters = "";

  // Concatenate filters to form the WHERE clause for the SQL query
  if (filters.length > 0) {
    concatenatedFilters = "WHERE ";

    filters.forEach((filter, index) => {
      if (index !== 0) {
        concatenatedFilters += "AND "; // Append 'AND' between filters
      }
      concatenatedFilters += filter + " "; // Concatenate filter with space
    });
  }

  // Execute the SQL query to retrieve jobs based on the filters
  const res = await db.query(
    `SELECT j.id,
            j.title,
            j.salary,
            j.equity,
            j.company_handle AS "companyHandle",
            c.name AS "companyName"
            FROM jobs j 
            LEFT JOIN companies AS c ON c.handle = j.company_handle
     ${concatenatedFilters}
     ORDER BY c.name, j.title`, values); // Use the concatenatedFilters in the query and pass values as parameters

  return res.rows; // Return the result of the query
}

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/
  static async get(id) {
    const jobRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
        [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job with Id: ${id}`);

    const companyRes = await db.query(
      `SELECT handle,
              name,
              description,
              num_employees AS "numEmployees",
              logo_url AS "logoUrl"
       FROM companies
       WHERE handle = $1`,
    [job.companyHandle]);

    // Remove the property companyHandle
    delete job.companyHandle;

    job.company = companyRes.rows[0];

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data,{});

    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity,
                                company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;
