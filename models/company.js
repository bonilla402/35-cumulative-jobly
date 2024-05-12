"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

/**
 * Finds companies based on optional filters.
 * @param {string} name - (Optional) Name of the company to filter by.
 * @param {number} minEmployees - (Optional) Minimum number of employees a company should have.
 * @param {number} maxEmployees - (Optional) Maximum number of employees a company should have.
 * @returns {Array<Object>} An array of objects representing the companies that match the provided filters.
 */
static async findAll(name, minEmployees, maxEmployees) {
  let values = [];
  let filters = [];

  // Construct filters based on provided parameters
  if (name) {
    values.push(name);
    filters.push(`name ILIKE '%' ||$${values.length} || '%'`); // Add filter for name
  }
  if (minEmployees) {
    values.push(minEmployees);
    filters.push(`num_employees > $${values.length}`); // Add filter for minimum number of employees
  }
  if (maxEmployees) {
    values.push(maxEmployees);
    filters.push(`num_employees < $${values.length}`); // Add filter for maximum number of employees
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

  // Execute the SQL query to retrieve companies based on the filters
  const companiesRes = await db.query(
    `SELECT handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"
     FROM companies
     ${concatenatedFilters}
     ORDER BY name`, values); // Use the concatenatedFilters in the query and pass values as parameters

  return companiesRes.rows; // Return the result of the query
}


  

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
