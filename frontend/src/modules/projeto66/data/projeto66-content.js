import { PROJETO66_ACTIVITY_KEYS } from './projeto66-contract'

export const projeto66Phases = [
  {
    id: 1, name: 'Quebra do Programa', range: 'Dias 1–22', color: '#ff6b00',
    description: 'Identificar e interromper os padrões automáticos do velho eu.',
    activities: [
      { title: 'O Contrato com o Novo Eu', days: '01', tag: 'Fundação da transformação', focus: 'Escreva quem você é hoje e quem decide ser. Assine o compromisso dos 66 dias e leia em voz alta toda manhã.' },
      { title: 'Mapeamento das Desculpas', days: '02', tag: 'Identificar o programa automático', focus: 'Liste suas desculpas frequentes e traduza cada uma para uma decisão de ação.' },
      { title: 'Primeira Meditação de Quebra', days: '03', tag: 'Observar sem se identificar', focus: 'Observe por dez minutos os pensamentos automáticos, sem julgamento.' },
      { title: 'Retomada do Controle', days: '4–7', tag: 'Vencer a preguiça inicial', focus: 'Acorde no primeiro toque, movimente o corpo e cumpra a versão mínima.' },
      { title: 'Aprofundamento', days: '8–14', tag: 'Interromper padrões', focus: 'Registre o velho padrão e pratique uma ação corretiva imediatamente.' },
      { title: 'Domínio das Reações', days: '15–22', tag: 'Estímulo e resposta', focus: 'Treine a pausa consciente antes de qualquer reação emocional.' },
    ],
  },
  {
    id: 2, name: 'Construção do Novo Eu', range: 'Dias 23–44', color: '#bf5af2',
    description: 'Treinar pensamentos, emoções e ações coerentes com a identidade escolhida.',
    activities: [
      { title: 'Visualização Ativa', days: '23–29', tag: 'Imprimir o futuro no presente', focus: 'Visualize o novo eu com emoção genuína e execute três missões diárias.' },
      { title: 'Marco dos 30 Dias', days: '30', tag: 'Carta ao velho eu', focus: 'Reconheça hábitos que morreram, os que nasceram e declare a separação.' },
      { title: 'Elevação Emocional', days: '31–37', tag: 'Estado emocional elevado', focus: 'Pratique gratidão específica, generosidade e redução de fontes negativas.' },
      { title: 'Palavra Cumprida', days: '38–44', tag: 'Identidade e contratos', focus: 'Trate cada promessa feita a si mesmo como um compromisso sagrado.' },
    ],
  },
  {
    id: 3, name: 'Consolidação da Identidade', range: 'Dias 45–66', color: '#30d158',
    description: 'Transformar repetição consciente em identidade e execução consistente.',
    activities: [
      { title: 'Agir por Decisão', days: '45–51', tag: 'Independente da vontade', focus: 'Quando surgir “não quero”, comece uma ação em cinco segundos.' },
      { title: 'Consolidação', days: '52–58', tag: 'Auditoria do novo programa', focus: 'Identifique comportamentos automáticos e reforce os que ainda exigem esforço.' },
      { title: 'Alta Performance', days: '59–65', tag: 'Provar com resultado', focus: 'Produza em alto nível e transforme a nova identidade em resultado.' },
      { title: 'Ritual da Nova Identidade', days: '66', tag: 'Fechamento do ciclo', focus: 'Celebre, registre a declaração de identidade e defina o próximo ciclo.' },
    ],
  },
]

export const defaultChecklist = {
  morning: ['Acordei no primeiro toque', 'Arrumei a cama', 'Meditação e visualização', 'Movimentei o corpo', 'Defini as 3 missões'],
  day: ['Ataquei a tarefa mais difícil', 'Fiz 1 bloco de foco', 'Venci uma desculpa com ação', 'Fiz uma renúncia consciente'],
  night: ['Cumpri as 3 missões', 'Revisei o dia com placar', 'Preparei o amanhã'],
}

export const projeto66Pillars = [
  { key: 'discipline', emoji: '🎯', name: 'Disciplina', color: '#ff6b00' },
  { key: 'focus', emoji: '🔬', name: 'Foco', color: '#bf5af2' },
  { key: 'self-control', emoji: '💪', name: 'Domínio Próprio', color: '#30d158' },
  { key: 'execution', emoji: '⚡', name: 'Execução', color: '#ff9500' },
  { key: 'emotional-control', emoji: '🧘', name: 'Controle Emocional', color: '#ffd60a' },
  { key: 'vital-energy', emoji: '🌟', name: 'Energia Vital', color: '#ff3b30' },
]

export const projeto66Missions = [
  { key: PROJETO66_ACTIVITY_KEYS.missions.result, emoji: '🎯', name: 'Resultado', description: 'Fazer 10 contatos comerciais' },
  { key: PROJETO66_ACTIVITY_KEYS.missions.health, emoji: '💪', name: 'Saúde', description: 'Caminhar 30 minutos' },
  { key: PROJETO66_ACTIVITY_KEYS.missions.organization, emoji: '🧹', name: 'Organização', description: 'Organizar mesa ou agenda' },
]

export const emotionOptions = [
  { value: 1, emoji: '😨', label: 'Medo' }, { value: 2, emoji: '😠', label: 'Raiva' },
  { value: 3, emoji: '😔', label: 'Tristeza' }, { value: 4, emoji: '😐', label: 'Neutro' },
  { value: 5, emoji: '💪', label: 'Coragem' }, { value: 6, emoji: '🙂', label: 'Aceitação' },
  { value: 7, emoji: '❤️', label: 'Amor' }, { value: 8, emoji: '🙏', label: 'Gratidão' },
]
