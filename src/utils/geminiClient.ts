export {
    GeminiModelUnavailableError,
    type GeminiGenerateRequest,
    type GeminiModelSummary,
    routingCache,
} from './geminiShared';
export { parseModelListResponse, listAccessibleGeminiModels, suggestGeminiFallbackModel } from './geminiCatalogClient';
export { ensureGeminiRouting, probeGeminiModelVersion, shouldSwitchGeminiVersion } from './geminiRoutingResolver';
export { generateGeminiContent } from './geminiGenerationClient';
import { parseModelListResponse, listAccessibleGeminiModels } from './geminiCatalogClient';
import { routingCache } from './geminiShared';

export const __testables__ = {
    parseModelListResponse,
    listAccessibleGeminiModels,
    routingCache,
};
