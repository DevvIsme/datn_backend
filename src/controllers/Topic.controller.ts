import { Request, Response } from "express";
import Topic from "../models/Topic.Model";
import { convertString } from "../helpers/convertToSlug";
import { Op } from "sequelize";

export const GetListTopic = async (req: Request, res: Response) => {
  try {
    const { key_name = "" } = req.query;

    const { count, rows: topics } = await Topic.findAndCountAll({
      where: {
        name: {
          [Op.like]: `%${key_name}%`,
        },
      },
      attributes: ["id", "name", "description", "slug"],
      order: [["name", "ASC"]],
    });

    return res.json({ count, topics });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Lỗi hệ thống", error: error.message });
  }
};

export const CreateTopic = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const topic = await Topic.findOne({ where: { name } });
    if (topic) {
      return res.status(409).json("Topic đã tồn tại!");
    }
    const slug = convertString(name);
    await Topic.create({ name, slug, description });
    return res.json("Tạo mới topic thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const UpdateTopic = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const topic = await Topic.findByPk(parseInt(id));
    if (!topic) {
      return res.status(404).json("Topic không tồn tại !");
    }
    const { name = topic.name, description = topic.description } = req.body;
    const slug = convertString(name);
    await topic.update({ name, slug, description });
    return res.json("Cập nhật topic thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const DeleteTopic = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const topic = await Topic.findByPk(parseInt(id));
    if (!topic) {
      return res.status(404).json("Topic không tồn tại !");
    }
    await topic.destroy();
    return res.json("Xoá topic thành công!");
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};

export const DetailTopic = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const topic = await Topic.findOne({ where: { slug }, raw: true });
    if (!topic) {
      return res.json(404).json("Chủ đề không tồn tại!");
    }
    return res.json(topic);
  } catch (error: any) {
    return res.status(500).json(error.message);
  }
};
