export const SIGHTS = [
  {
    id: 1,
    name: 'Colosseum',
    coords: [12.492222, 41.890278] as [number, number],
    isFree: false,
    image:
      'https://images.unsplash.com/photo-1612986023929-569221d13721?q=80&w=2950&auto=format&fit=crop',
    description:
      'Колизей — символ Рима и величайший амфитеатр античности. Здесь проходили гладиаторские бои и массовые зрелища. Это чудо инженерной мысли вмещало до 50 000 зрителей и до сих пор поражает своим величием. Обязателен к посещению, чтобы прикоснуться к истории Древнего Рима.',
    iconType: 'ruin',
    tripadvisorRating: 4.6,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d192285-Reviews-Colosseum-Rome_Lazio.html',
  },
  {
    id: 2,
    name: 'Pantheon',
    coords: [12.4768, 41.8986] as [number, number],
    isFree: false,
    image:
      'https://images.unsplash.com/photo-1614354987493-a010f414d0d1?q=80&w=2940&auto=format&fit=crop',
    description:
      'Пантеон — храм всех богов и архитектурное чудо с самым большим в мире неармированным бетонным куполом. Через отверстие в центре (окулус) внутрь проникает свет, создавая божественную атмосферу. Здесь похоронен Рафаэль и короли Италии. Вход бесплатный, а внутри вас ждет тысячелетняя история.',
    iconType: 'temple',
    tripadvisorRating: 4.7,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d197714-Reviews-Pantheon-Rome_Lazio.html',
  },
  {
    id: 3,
    name: 'Trevi Fountain',
    coords: [12.483056, 41.900833] as [number, number],
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1596627118111-5b6c7890bc1b?q=80&w=2940&auto=format&fit=crop',
    description:
      'Фонтан Треви — самый знаменитый фонтан в мире и шедевр барокко. Бросьте монетку через левое плечо, и вы обязательно вернетесь в Рим. Легендарная сцена из фильма «Сладкая жизнь» Феллини сделала его культовым местом. Приходите на закате — огни делают его по-настоящему волшебным.',
    iconType: 'fountain',
    tripadvisorRating: 4.4,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d190131-Reviews-Trevi_Fountain-Rome_Lazio.html',
  },
  {
    id: 4,
    name: 'Vatican Museum',
    coords: [12.454444, 41.906389] as [number, number],
    isFree: false,
    image:
      'https://images.unsplash.com/photo-1672951418188-f4f39601af85?q=80&w=1470&auto=format&fit=crop',
    description:
      'Музеи Ватикана — одно из величайших художественных собраний мира. Главная жемчужина — Сикстинская капелла с фресками Микеланджело «Сотворение Адама» и «Страшный суд». Здесь также хранятся шедевры Рафаэля, Леонардо и Караваджо. Ради этого стоит выстоять любую очередь.',
    iconType: 'museum',
    tripadvisorRating: 4.8,
    tripadvisorUrl:
      'https://www.tripadvisor.com/AttractionProductReview-g187791-d33373505-St_Peter_s_Basilica_Optional_Skip_the_Line_Vatican_Museums-Rome_Lazio.html',
  },
  {
    id: 5,
    name: "St. Peter's Basilica",
    coords: [12.453333, 41.902222] as [number, number],
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1577236272826-c8638927d664?q=80&w=2574&auto=format&fit=crop',
    description:
      'Собор Святого Петра — сердце Ватикана и крупнейший христианский храм в мире. Здесь хранится «Пьета» Микеланджело и захоронены многие папы римские. Поднимитесь на купол — вас ждет захватывающий вид на Вечный город и площадь с колоннадой Бернини. Вход бесплатный, а величие поражает воображение.',
    iconType: 'basilica',
    tripadvisorRating: 4.8,
    tripadvisorUrl:
      'https://www.tripadvisor.com/AttractionProductReview-g187791-d33373505-St_Peter_s_Basilica_Optional_Skip_the_Line_Vatican_Museums-Rome_Lazio.html',
  },
  {
    id: 6,
    name: 'Piazza Navona',
    coords: [12.473056, 41.899167] as [number, number],
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1740004000873-745230b8bdbc?q=80&w=2942&auto=format&fit=crop',
    description:
      'Пьяцца Навона — одна из самых красивых площадей Рима, построенная на месте античного стадиона Домициана. Здесь находятся фонтаны работы Бернини, включая знаменитый «Фонтан Четырех рек». Это идеальное место, чтобы выпить кофе, насладиться архитектурой и почувствовать римскую dolce vita.',
    iconType: 'square',
    tripadvisorRating: 4.5,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d190121-Reviews-Piazza_Navona-Rome_Lazio.html',
  },
  {
    id: 7,
    name: 'Spanish Steps',
    coords: [12.4828, 41.9061] as [number, number],
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1654874106386-c81a5cd7007a?q=80&w=1279&auto=format&fit=crop',
    description:
      'Испанская лестница — самая знаменитая лестница в мире, состоящая из 135 ступеней. Она соединяет площадь Испании с церковью Тринита-дей-Монти. Это излюбленное место встреч римлян и туристов, особенно красивое весной, когда она усыпана цветами азалии. Рядом — лучшие магазины и уютные улочки.',
    iconType: 'square',
    tripadvisorRating: 3.9,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d197717-Reviews-Spanish_Steps-Rome_Lazio.html',
  },
  {
    id: 8,
    name: "Castel Sant'Angelo",
    coords: [12.466389, 41.903056] as [number, number],
    isFree: false,
    image:
      'https://images.unsplash.com/photo-1512064444180-54b51a475aa7?q=80&w=2954&auto=format&fit=crop',
    description:
      'Замок Святого Ангела — мавзолей императора Адриана, позже ставший папской крепостью и тюрьмой. С верхней террасы открывается лучший вид на Рим и Собор Святого Петра. Перейдите мост Ангелов с прекрасными статуями Бернини и почувствуйте дух истории от античности до Возрождения.',
    iconType: 'castle',
    tripadvisorRating: 4.5,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d191105-Reviews-Castel_Sant_Angelo-Rome_Lazio.html',
  },
  {
    id: 9,
    name: 'Roman Forum',
    coords: [12.485278, 41.8925] as [number, number],
    isFree: false,
    image:
      'https://images.unsplash.com/photo-1687288389893-a016b02c5548?q=80&w=1470&auto=format&fit=crop',
    description:
      'Римский форум — центр политической, религиозной и общественной жизни Древнего Рима. Здесь находятся руины храмов, базилик и триумфальных арок. Прогуливаясь по Via Sacra (Священной дороге), вы буквально идете по следам Цезаря и императоров. Место, где история оживает на каждом шагу.',
    iconType: 'ruin',
    tripadvisorRating: 4.6,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d2154770-Reviews-Roman_Forum-Rome_Lazio.html',
  },
  {
    id: 10,
    name: 'Torre Argentina Cat Sanctuary',
    coords: [12.476944, 41.895556] as [number, number],
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1631189005521-5c9221bce29b?q=80&w=2940&auto=format&fit=crop',
    description:
      'Ларго ди Торре Арджентина — место, где в 44 году до н.э. был убит Юлий Цезарь. Сегодня это археологическая зона с четырьмя древними храмами и знаменитым кошачьим приютом. Вы можете посмотреть на руины сверху бесплатно или зайти внутрь и погладить местных котов, живущих среди истории.',
    iconType: 'ruin',
    tripadvisorRating: 4.5,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d4416917-Reviews-Torre_Argentina_Cat_Sanctuary-Rome_Lazio.html',
  },
  {
    id: 11,
    name: 'Piazza del Popolo',
    coords: [12.476389, 41.911111] as [number, number],
    isFree: true,
    image:
      'https://images.unsplash.com/photo-1614355000558-76c52c9562f5?q=80&w=1287&auto=format&fit=crop',
    description:
      'Пьяцца дель Пополо — грандиозная неоклассическая площадь, которую веками использовали для публичных казней. В центре возвышается древнеегипетский обелиск, а площадь обрамляют две церкви-близнецы. Отсюда открывается вид на холм Пинчо и город. Идеальное место, чтобы начать знакомство с Римом.',
    iconType: 'square',
    tripadvisorRating: 4.3,
    tripadvisorUrl:
      'https://www.tripadvisor.com/Attraction_Review-g187791-d191110-Reviews-Piazza_del_Popolo-Rome_Lazio.html',
  },
];

export const ALYA_SHOPPING = [
  {
    id: 'z1',
    name: 'ZAlya Via del Corso',
    coords: [12.4789, 41.9051] as [number, number], // Via del Corso, 189 - near Piazza Colonna
    description:
      "Main touristic attraction for Donna Alevtonna - Zara flagship store on Rome's main shopping street. Open 10:00-21:00.",
    image:
      'https://images.unsplash.com/photo-1642368123664-b17f874c071b?q=80&w=1528&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 'z2',
    name: 'Zara Via Appia',
    coords: [12.5172, 41.8808] as [number, number],
    description:
      'Zara store on Via Appia Nuova. Open 10:00-20:30. Located near Ponte Lungo Metro station.',
  },
  {
    id: 'z3',
    name: 'Zara Euroma2',
    coords: [12.4591, 41.818] as [number, number], // Euroma2 shopping mall - EUR district
    description: 'Zara at Euroma2 shopping center. Open 10:00-21:00.',
  },
  {
    id: 'z4',
    name: 'Zara Porta di Roma',
    coords: [12.53, 41.95] as [number, number], // Porta di Roma shopping center
    description: 'Zara at Porta di Roma shopping mall. Open 10:00-22:00.',
  },
  {
    id: 'z5',
    name: 'Zara Gran Roma',
    coords: [12.645, 41.863] as [number, number], // Gran Roma shopping center - Via di Torre Spaccata, 235
    description: 'Zara at Gran Roma shopping center. Open 09:30-20:30.',
  },
  {
    id: 'z6',
    name: 'Zara Roma Est',
    coords: [12.62, 41.89] as [number, number], // Roma Est shopping center - Via Collatina, 858
    description: 'Zara at Roma Est shopping mall. Open 10:00-21:00.',
  },
];

export const ROME_CENTER: [number, number] = [12.4964, 41.9028];

export const HOME_LOCATION = {
  id: 'home',
  name: 'Home',
  coords: [12.4795, 41.8540] as [number, number],
  address: 'Via Gabriello Chiabrera, 39, 00145 Roma',
};
