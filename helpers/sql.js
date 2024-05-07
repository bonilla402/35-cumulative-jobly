const { BadRequestError } = require("../expressError");

/**
 * Generates SQL query parameters for a partial update operation.
 *
 * @param {Object} dataToUpdate - The data to be updated, in key-value pairs.
 * @param {Object} jsToSql - An object mapping JavaScript-style column names to their corresponding SQL-style column names.
 * @returns {Object} An object containing the set clause and values for the SQL query.
 * @throws {BadRequestError} Throws an error if no data is provided for updating.
 *
 * @example
 * // Returns:
 * // {
 * //   setCols: '"first_name"=$1, "age"=$2',
 * //   values: ['Aliya', 32]
 * // }
 * sqlForPartialUpdate({ firstName: 'Aliya', age: 32 }, { firstName: 'first_name' });
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // Extract keys from dataToUpdate
  const keys = Object.keys(dataToUpdate);

  // Throw an error if no data is provided
  if (keys.length === 0) throw new BadRequestError("No data");

  // Map keys to SQL-style column names and placeholders
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`
  );

  // Return an object containing the set clause and values
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
