import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { NextResponse } from 'next/server';

export const maxDuration = 30;

const atendimentoExtendidoSchema = z.object({
  tipo_entidade: z
    .enum(['cliente', 'funcionario', 'terceiro', 'fornecedor'])
    .describe(
      'Tipo de pessoa ou empresa mencionada no áudio. Identifique se é cliente, funcionário da fazenda, fornecedor de insumos ou terceiro/transportador. Padrão: cliente.'
    ),
  status_crm: z
    .enum(['possibilidade', 'cliente_ativo'])
    .describe(
      'Classificação do contato: "possibilidade" se é um novo cliente/prospecto/orçamento sem compra fechada, ou "cliente_ativo" se já é cliente / já comprou.'
    ),
  nome_cliente: z
    .string()
    .nullable()
    .describe('Nome da pessoa, produtor rural, fazenda, terceiro ou fornecedor citado'),
  telefone: z
    .string()
    .nullable()
    .describe('Telefone ou WhatsApp citado (somente números se fornecido)'),
  endereco_fazenda: z
    .string()
    .nullable()
    .describe('Endereço completo da fazenda, comunidade, rodovia ou município de entrega (ex: Linhares BR-101 Km 45)'),
  quantidade_animais: z
    .string()
    .nullable()
    .describe('Quantidade de animais / cabeças de gado citadas na fazenda (ex: 120 cabeças, 50 vacas de leite)'),
  capacidade_carga_toneladas: z
    .number()
    .nullable()
    .describe('Se for um terceiro/caminhoneiro/freteiro, a capacidade máxima de carga do caminhão em toneladas (ex: 5, 12, 25)'),
  tipo_veiculo: z
    .string()
    .nullable()
    .describe('Tipo do caminhão ou veículo do terceiro (ex: Truck, Carreta, Toco, 3/4, Van)'),
  produto: z
    .string()
    .nullable()
    .describe('Produto de silagem ou insumo citado (ex: Silagem de Milho, Sorgo, Capiaçu, Capim, Sacos, Toneladas)'),
  quantidade: z
    .string()
    .nullable()
    .describe('Quantidade solicitada ou negociada (ex: 10 toneladas, 50 sacos, 2 carretas)'),
  valor_total: z
    .number()
    .nullable()
    .describe('Valor monetário total negociado em Reais (ex: 2500.00 se citado R$ 2.500)'),
  data_proximo_contato: z
    .string()
    .nullable()
    .describe(
      'Data formatada como YYYY-MM-DD para o próximo contato ou retorno ao cliente. Calcule com base na data de hoje.'
    ),
  data_previsao_fim_estoque: z
    .string()
    .nullable()
    .describe(
      'Data estimada formatada como YYYY-MM-DD em que a silagem do cliente vai acabar. Se o usuário disser "vai durar 2 meses", some esse tempo à data de hoje.'
    ),
  observacao: z
    .string()
    .nullable()
    .describe('Notas adicionais, localização da fazenda, forma de pagamento, entregas ou observações gerais'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const texto = body.texto || body.text;

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nenhum texto de áudio foi fornecido para interpretação.' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey || apiKey.includes('sua-chave') || apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            'Chave do Google Gemini não configurada. Por favor, adicione sua chave GOOGLE_GENERATIVE_AI_API_KEY no arquivo .env.local.',
        },
        { status: 401 }
      );
    }

    const hoje = new Date().toISOString().split('T')[0];

    const promptText = `Você é o assistente inteligente de CRM do Agronegócio para a Caboclo Silagem.
A data de hoje é: ${hoje}.

Analise a transcrição de voz fornecida pelo vendedor/atendente:
"${texto}"

Extraia com máxima precisão os dados estruturados:
1. tipo_entidade: 'cliente', 'funcionario', 'terceiro' ou 'fornecedor'.
2. status_crm: 'possibilidade' ou 'cliente_ativo'.
3. nome_cliente: Nome do contato, motorista/terceiro ou fazenda.
4. telefone: Telefone se citado.
5. endereco_fazenda: Localização ou endereço da fazenda.
6. quantidade_animais: Quantidade de cabeças de gado/animais citadas.
7. capacidade_carga_toneladas: Se for terceiro/transportador, a capacidade de carga em toneladas (ex: 5.0, 12.0, 25.0).
8. tipo_veiculo: Tipo do caminhão (ex: Toco, Truck, Carreta).
9. produto: Tipo de silagem ou produto.
10. quantidade: Volume ou quantidade negociada.
11. valor_total: Valor monetário total numérico se citado.
12. data_proximo_contato: Data YYYY-MM-DD para retornar o contato.
13. data_previsao_fim_estoque: Data YYYY-MM-DD em que a silagem do cliente vai acabar.
14. observacao: Detalhes adicionais da conversa.`;

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        result = await generateObject({
          model: google('gemini-3.8-flash'),
          schema: atendimentoExtendidoSchema,
          prompt: promptText,
        });
        break;
      } catch (err: any) {
        console.warn(`Tentativa ${attempts} de ${maxAttempts} no Gemini:`, err?.message);
        if (attempts >= maxAttempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (!result) {
      throw new Error('Não foi possível obter resposta da IA após 3 tentativas.');
    }

    return NextResponse.json(result.object);
  } catch (error: any) {
    console.error('Erro na API /api/entender-voz com Google Gemini:', error);

    const errorMessage = error?.message || '';

    if (
      errorMessage.includes('high demand') ||
      errorMessage.includes('503') ||
      errorMessage.includes('429')
    ) {
      return NextResponse.json(
        {
          error:
            'O serviço do Google Gemini está com pico de acessos global no momento. Aguarde 5 segundos e toque novamente no microfone.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Falha ao processar o texto com o Google Gemini.' },
      { status: 500 }
    );
  }
}
