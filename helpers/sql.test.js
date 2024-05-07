const { sqlForPartialUpdate } = require('./sql');
const { BadRequestError } = require("../expressError");

describe('sqlForPartialUpdate', () => {
  test('should generate the correct SQL set clause', () => {
    const dataToUpdate = { firstName: 'Aliya', age: 32 };
    const jsToSql = { firstName: 'first_name' };
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result.setCols).toEqual('"first_name"=$1, "age"=$2');
  });


  test('should throw an error when no data is provided for updating', () => {
    expect(() => {
      sqlForPartialUpdate({}, {});
    }).toThrow(BadRequestError);
  });

  test('should generate the correct values array for the SQL query', () => {
    const dataToUpdate = { firstName: 'Aliya', age: 32 };
    const jsToSql = { firstName: 'first_name' };
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result.values).toEqual(['Aliya', 32]);
  });
});
