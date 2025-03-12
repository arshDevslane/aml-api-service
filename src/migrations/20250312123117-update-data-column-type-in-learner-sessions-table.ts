import { QueryInterface, DataTypes } from 'sequelize';

const tableName = 'learner_sessions';
const columnName = 'data';

export = {
  /**
   * Write code here for migration.
   *
   * @param queryInterface
   */
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn(tableName, columnName, {
      type: DataTypes.TEXT,
      allowNull: false,
    });
  },

  /**
   * Write code here for migration rollback.
   *
   * @param queryInterface
   */
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
            ALTER TABLE ${tableName} 
            ALTER COLUMN ${columnName} TYPE JSONB 
            USING (data::jsonb)
        `);

    // Then ensure the column maintains its not-null constraint
    await queryInterface.changeColumn(tableName, columnName, {
      type: DataTypes.JSONB,
      allowNull: false,
    });
  },
};
