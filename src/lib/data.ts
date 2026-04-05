export const SIGHTS = [
  {
    id: 1,
    name: "Colosseum",
    coords: [12.4922, 41.8902] as [number, number],
    isFree: false,
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop",
    description: "The iconic Roman amphitheatre.",
    iconType: "ruin"
  },
  {
    id: 2,
    name: "Pantheon",
    coords: [12.4769, 41.8986] as [number, number],
    isFree: false,
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop",
    description: "Former Roman temple, now a church and architectural marvel.",
    iconType: "temple"
  },
  {
    id: 3,
    name: "Trevi Fountain",
    coords: [12.4833, 41.9009] as [number, number],
    isFree: true,
    image: "https://images.unsplash.com/photo-1525874684015-58379d421a52?q=80&w=600&auto=format&fit=crop",
    description: "Baroque masterpiece and city landmark.",
    iconType: "fountain"
  },
  {
    id: 4,
    name: "Vatican Museums",
    coords: [12.4533, 41.9065] as [number, number],
    isFree: false,
    image: "https://images.unsplash.com/photo-1543333309-8759971953fe?q=80&w=600&auto=format&fit=crop",
    description: "Art and Christian sculptures by several popes.",
    iconType: "museum"
  },
  {
    id: 5,
    name: "St. Peter's Basilica",
    coords: [12.4539, 41.9022] as [number, number],
    isFree: true,
    image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?q=80&w=600&auto=format&fit=crop",
    description: "Major basilica of the Vatican City.",
    iconType: "basilica"
  },
  {
    id: 6,
    name: "Piazza Navona",
    coords: [12.4731, 41.8992] as [number, number],
    isFree: true,
    image: "https://images.unsplash.com/photo-1512411880951-404c0ec01ea2?q=80&w=600&auto=format&fit=crop",
    description: "Built on the site of the Stadium of Domitian.",
    iconType: "square"
  },
  {
    id: 7,
    name: "Spanish Steps",
    coords: [12.4828, 41.9059] as [number, number],
    isFree: true,
    image: "https://images.unsplash.com/photo-1616190419596-e2839e955d4b?q=80&w=600&auto=format&fit=crop",
    description: "A monumental stairway of 135 steps.",
    iconType: "square"
  },
  {
    id: 8,
    name: "Castel Sant'Angelo",
    coords: [12.4663, 41.9031] as [number, number],
    isFree: false,
    image: "https://images.unsplash.com/photo-1529154036614-a60975f5c760?q=80&w=600&auto=format&fit=crop",
    description: "Mausoleum of Hadrian and a papacy fortress.",
    iconType: "castle"
  }
];

export const ALYA_SHOPPING = [
  {
    id: "z1",
    name: "ZAля Via del Corso",
    coords: [12.4795, 41.9025] as [number, number],
    description: "ZAля flagship store for Donna Alevtisia to reign over the historic Palazzo Bocconi."
  },
  {
    id: "z2",
    name: "ZAля Man Palazzo Verospi",
    coords: [12.4800, 41.9030] as [number, number],
    description: "Because even Donna Alevtisia needs to critique the men's section at Palazzo Verospi."
  },
  {
    id: "z3",
    name: "ZAля Via Appia Nuova",
    coords: [12.5135, 41.8814] as [number, number],
    description: "Warning: High risk of Donna Alevtisia blowing the entire trip budget right here."
  }
];

// Day 1: Historic Center (Piazza Navona, Trevi, Pantheon)
export const DAY1_ZONE: [number, number][] = [
  [12.468, 41.903],
  [12.485, 41.905],
  [12.488, 41.898],
  [12.472, 41.895]
];

// Day 2: Ancient Rome (Colosseum, Forum)
export const DAY2_ZONE: [number, number][] = [
  [12.488, 41.896],
  [12.502, 41.898],
  [12.505, 41.888],
  [12.490, 41.885]
];

// Day 3: Vatican & Trastevere
export const DAY3_ZONE: [number, number][] = [
  [12.450, 41.908],
  [12.465, 41.908],
  [12.472, 41.885],
  [12.460, 41.882],
  [12.450, 41.895]
];

export const ROME_CENTER: [number, number] = [12.4964, 41.9028];
