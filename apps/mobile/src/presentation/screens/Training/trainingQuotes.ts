export interface TrainingQuote {
  id: number;
  text: string;
  text_en?: string;
  author?: string;
  category: 'mental' | 'geometric' | 'technique' | 'consistency';
}

export const TRAINING_QUOTES: TrainingQuote[] = [
  {
    id: 1,
    text: 'Listo para tu entrenamiento. Elige o crea tu jugada e iniciemos.',
    text_en: 'Ready for your training. Choose or create your shot and let us begin.',
    category: 'mental',
  },
  {
    id: 2,
    text: '¿Qué tipo de jugadas te han costado trabajo? ¡Vamos a entrenarlas!',
    text_en: 'Which shots have challenged you? Let us train them!',
    category: 'mental',
  },
  {
    id: 3,
    text: 'La carambola se gana en la repetición y la memoria muscular.',
    text_en: 'Carom is won through repetition and muscle memory.',
    author: 'Torbjörn Blomdahl',
    category: 'consistency',
  },
  {
    id: 4,
    text: 'Cada banda cuenta, cada milímetro importa. Concéntrate en el punto de contacto.',
    text_en: 'Every cushion counts, every millimeter matters. Focus on the contact point.',
    category: 'technique',
  },
  {
    id: 5,
    text: 'El billar a 3 bandas es geometría pura: confía en el cálculo del diamante.',
    text_en: '3-cushion billiards is pure geometry: trust the diamond calculation.',
    author: 'Raymond Ceulemans',
    category: 'geometric',
  },
  {
    id: 6,
    text: 'Fuerza controlada y llegada justa: la siguiente carambola depende de la reunión.',
    text_en: 'Controlled speed and accurate arrival: the next carom depends on gathering the balls.',
    category: 'technique',
  },
  {
    id: 7,
    text: 'Un tiro bien entrenado no falla bajo presión de torneo.',
    text_en: 'A well-trained shot does not miss under tournament pressure.',
    category: 'mental',
  },
  {
    id: 8,
    text: 'Domina el efecto antes del impacto y la mesa trabajará para ti.',
    text_en: 'Master spin before impact and the table will work for you.',
    author: 'Frédéric Caudron',
    category: 'technique',
  },
  {
    id: 9,
    text: 'No practiques hasta acertar una vez; practica hasta que no puedas fallar.',
    text_en: 'Do not practice until you get it right; practice until you cannot get it wrong.',
    category: 'consistency',
  },
  {
    id: 10,
    text: 'La concentración en la rutina pre-tiro es el 80% del éxito de la tacada.',
    text_en: 'Focus during the pre-shot routine is 80% of shot success.',
    category: 'mental',
  },
  {
    id: 11,
    text: 'Ajusta la llegada a la banda corta: la precisión nace en el primer tercio del paño.',
    text_en: 'Adjust your arrival at the short cushion: precision is born in the first third of the cloth.',
    category: 'geometric',
  },
  {
    id: 12,
    text: 'El secreto del bricole está en la penetración constante del taco.',
    text_en: 'The secret of the cushion-first shot lies in smooth, consistent cue penetration.',
    author: 'Dick Jaspers',
    category: 'technique',
  },
  {
    id: 13,
    text: 'Convierte tus posiciones débiles en tus mejores armas de defensa y ataque.',
    text_en: 'Turn your weak positions into your greatest defense and offensive weapons.',
    category: 'mental',
  },
  {
    id: 14,
    text: 'Un campeón de 3 bandas repite lo básico hasta convertirlo en arte.',
    text_en: 'A 3-cushion champion repeats fundamentals until they become art.',
    author: 'Semih Saygıner',
    category: 'consistency',
  },
  {
    id: 15,
    text: 'Cada intento suma experiencia. Respira, visualiza la trayectoria y ejecuta.',
    text_en: 'Every attempt adds experience. Breathe, visualize the trajectory, and execute.',
    category: 'mental',
  },
  {
    id: 16,
    text: 'La bola 2 dicta el juego: contrólala para evitar el retruque y asegurar posición.',
    text_en: 'Ball 2 dictates the game: control it to prevent kisses and ensure position.',
    category: 'technique',
  },
  {
    id: 17,
    text: 'En el Sistema Clásico 50: Salida - Llegada = Ataque. La matemática nunca miente.',
    text_en: 'In the Classic 50 System: Departure - Arrival = Attack. Mathematics never lies.',
    category: 'geometric',
  },
];

export function getRandomTrainingQuote(lang?: string): TrainingQuote {
  const index = Math.floor(Math.random() * TRAINING_QUOTES.length);
  const quote = TRAINING_QUOTES[index];
  if (lang === 'en') {
    return getLocalizedTrainingQuote(quote, 'en');
  }
  return quote;
}

export function getLocalizedTrainingQuote(quote: TrainingQuote, lang?: string): TrainingQuote {
  if (lang === 'en' && quote.text_en) {
    return {
      ...quote,
      text: quote.text_en,
    };
  }
  return quote;
}
