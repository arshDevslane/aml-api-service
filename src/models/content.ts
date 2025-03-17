import { DataTypes, Model } from 'sequelize';
import { AppDataSource } from '../config';
import { Taxonomy } from '../types/taxonomy';

export class Content extends Model {
  declare id: number;
  declare identifier: string;
  declare name: { [key: string]: string };
  declare description?: { [key: string]: string } | null;
  declare tenant?: { id: number; name: { [key: string]: string } } | null;
  declare repository?: { id: number; name: { [key: string]: string } } | null;
  declare taxonomy: Taxonomy;
  declare sub_skills?: Array<{ id: number; name: { [key: string]: string } }> | null;
  declare gradient?: string | null;
  declare status: 'draft' | 'live';
  declare media: Array<{ src: string; fileName: string; mimeType: string; mediaType: string; language?: string }> | null;
  declare created_by: string;
  declare updated_by?: string | null;
  declare is_active: boolean;
  declare x_id: string;
}

Content.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    description: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    tenant: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    repository: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    taxonomy: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Taxonomy information including board, class, and skills',
    },
    sub_skills: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    gradient: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'live'),
      allowNull: false,
    },
    media: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    updated_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    x_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: AppDataSource,
    modelName: 'Content',
    tableName: 'content',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
