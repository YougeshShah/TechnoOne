import { Request, Response } from "express";
import { aiAssistantService } from "../service/ai-assistant.service";
import { askAssistantSchema } from "../dto/ai-assistant.dto";

export const aiAssistantController = {
  async ask(req: Request, res: Response) {
    const input = askAssistantSchema.parse(req.body);
    const lawFirmId = req.auth!.accountType === "COMPANY" ? null : req.auth!.lawFirmId;
    const result = await aiAssistantService.ask(input.question, lawFirmId, input.history);
    res.status(200).json({ success: true, data: result });
  },
};
