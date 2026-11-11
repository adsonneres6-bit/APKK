export interface RawRow {
  /** Coluna A (índice 0) */
  colA: string;
  /** Coluna B (índice 1) — Sequence */
  sequence: string;
  /** Coluna C (índice 2) */
  colC: string;
  /** Coluna D (índice 3) — SPX TN */
  spxTn: string;
  /** Coluna E (índice 4) — Destination Address */
  destinationAddress: string;
  /** Coluna F (índice 5) */
  colF: string;
  /** Coluna G (índice 6) */
  colG: string;
  /** Coluna H (índice 7) */
  colH: string;
  /** Coluna I (índice 8) */
  colI: string;
  /** Coluna J (índice 9) */
  colJ: string;
  /** Demais colunas a partir do índice 10 */
  extra: string[];
  /** Índice original na planilha (0-based, sem cabeçalho) */
  originalIndex: number;
}

export interface NormalizedAddress {
  /** Endereço normalizado para comparação */
  normalized: string;
  /** Tipo do logradouro expandido (Avenida, Rua, etc.) */
  streetType: string;
  /** Nome da rua sem o tipo */
  streetName: string;
  /** Número do imóvel extraído */
  number: string;
}

export interface DeliveryGroup {
  /** ID único do grupo */
  id: string;
  /** Endereço oficial consolidado */
  officialAddress: string;
  /** Endereço normalizado */
  normalizedAddress: string;
  /** Número do imóvel */
  number: string;
  /** Nome da rua normalizado */
  streetName: string;
  /** Índices das linhas originais que pertencem ao grupo */
  rowIndices: number[];
  /** Lista de SPX TN do grupo */
  spxTns: string[];
  /** Lista de Sequence originais */
  sequences: string[];
  /** Linha principal (primeira ocorrência) */
  primaryRowIndex: number;
  /** Sequência gerada pelo sequenciamento (ex: "1A, 1B") */
  generatedSequence: string;
  /** Número base da sequência (ex: 1) */
  sequenceBase: number;
  /** Letras da sequência (ex: ["A", "B"]) */
  sequenceLetters: string[];
  /** Indica se todos os pedidos do grupo foram conferidos */
  allChecked: boolean;
  /** Indica se o grupo já foi concluído (sequência exibida) */
  completed: boolean;
}

export interface CheckState {
  /** Mapa de SPX TN -> conferido */
  checked: Record<string, boolean>;
  /** Mapa de SPX TN -> índice do grupo */
  spxToGroup: Record<string, number>;
}

export interface SearchResult {
  row: RawRow;
  group?: DeliveryGroup;
  groupIndex: number;
}
