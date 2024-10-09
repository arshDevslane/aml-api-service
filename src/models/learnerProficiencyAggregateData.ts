import { DataTypes, Model } from 'sequelize';
import { AppDataSource } from '../config';

export class LearnerProficiencyAggregateData extends Model {
  declare id: number;
  declare identifier: string;
  declare learner_id: string;
  declare class: string;
  declare l1_skill: string;
  declare l2_skill: string;
  declare l3_skill: string;
  declare taxonomy: { board: string; class: string };
  declare sub_skills: any;
  declare questions_count: number;
  declare score: number;
  declare created_by: string;
  declare updated_by: string;
}

LearnerProficiencyAggregateData.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    learner_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    class: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    l1_skill: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    l2_skill: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    l3_skill: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taxonomy: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    sub_skills: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    questions_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updated_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: AppDataSource,
    modelName: 'LearnerProficiencyAggregateData',
    tableName: 'learner_proficiency_aggregate_data',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
