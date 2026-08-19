export interface FakerMethod {
  label: string
  value: string
  module: string
}

export const FAKER_METHODS: FakerMethod[] = [
  // Airline
  { label: 'airline.aircraftType', value: 'airline.aircraftType()', module: 'Airline' },
  { label: 'airline.airline', value: 'airline.airline()', module: 'Airline' },
  { label: 'airline.airplane', value: 'airline.airplane()', module: 'Airline' },
  { label: 'airline.airport', value: 'airline.airport()', module: 'Airline' },
  { label: 'airline.recordLocator', value: 'airline.recordLocator()', module: 'Airline' },
  { label: 'airline.seat', value: 'airline.seat()', module: 'Airline' },

  // Animal
  { label: 'animal.bear', value: 'animal.bear()', module: 'Animal' },
  { label: 'animal.bird', value: 'animal.bird()', module: 'Animal' },
  { label: 'animal.cat', value: 'animal.cat()', module: 'Animal' },
  { label: 'animal.cetacean', value: 'animal.cetacean()', module: 'Animal' },
  { label: 'animal.cow', value: 'animal.cow()', module: 'Animal' },
  { label: 'animal.crocodilia', value: 'animal.crocodilia()', module: 'Animal' },
  { label: 'animal.dog', value: 'animal.dog()', module: 'Animal' },
  { label: 'animal.fish', value: 'animal.fish()', module: 'Animal' },
  { label: 'animal.horse', value: 'animal.horse()', module: 'Animal' },
  { label: 'animal.insect', value: 'animal.insect()', module: 'Animal' },
  { label: 'animal.lion', value: 'animal.lion()', module: 'Animal' },
  { label: 'animal.petName', value: 'animal.petName()', module: 'Animal' },
  { label: 'animal.rabbit', value: 'animal.rabbit()', module: 'Animal' },
  { label: 'animal.rodent', value: 'animal.rodent()', module: 'Animal' },
  { label: 'animal.snake', value: 'animal.snake()', module: 'Animal' },
  { label: 'animal.type', value: 'animal.type()', module: 'Animal' },

  // Book
  { label: 'book.author', value: 'book.author()', module: 'Book' },
  { label: 'book.format', value: 'book.format()', module: 'Book' },
  { label: 'book.genre', value: 'book.genre()', module: 'Book' },
  { label: 'book.publisher', value: 'book.publisher()', module: 'Book' },
  { label: 'book.series', value: 'book.series()', module: 'Book' },
  { label: 'book.title', value: 'book.title()', module: 'Book' },

  // Color
  { label: 'color.cssSupportedFunction', value: 'color.cssSupportedFunction()', module: 'Color' },
  { label: 'color.cssSupportedSpace', value: 'color.cssSupportedSpace()', module: 'Color' },
  { label: 'color.human', value: 'color.human()', module: 'Color' },

  // Commerce
  { label: 'commerce.department', value: 'commerce.department()', module: 'Commerce' },
  { label: 'commerce.isbn', value: 'commerce.isbn()', module: 'Commerce' },
  { label: 'commerce.productAdjective', value: 'commerce.productAdjective()', module: 'Commerce' },
  { label: 'commerce.productDescription', value: 'commerce.productDescription()', module: 'Commerce' },
  { label: 'commerce.productMaterial', value: 'commerce.productMaterial()', module: 'Commerce' },
  { label: 'commerce.productName', value: 'commerce.productName()', module: 'Commerce' },
  { label: 'commerce.upc', value: 'commerce.upc()', module: 'Commerce' },

  // Company
  { label: 'company.buzzAdjective', value: 'company.buzzAdjective()', module: 'Company' },
  { label: 'company.buzzNoun', value: 'company.buzzNoun()', module: 'Company' },
  { label: 'company.buzzPhrase', value: 'company.buzzPhrase()', module: 'Company' },
  { label: 'company.buzzVerb', value: 'company.buzzVerb()', module: 'Company' },
  { label: 'company.catchPhrase', value: 'company.catchPhrase()', module: 'Company' },
  { label: 'company.catchPhraseAdjective', value: 'company.catchPhraseAdjective()', module: 'Company' },
  { label: 'company.catchPhraseDescriptor', value: 'company.catchPhraseDescriptor()', module: 'Company' },
  { label: 'company.catchPhraseNoun', value: 'company.catchPhraseNoun()', module: 'Company' },
  { label: 'company.name', value: 'company.name()', module: 'Company' },

  // Database
  { label: 'database.collation', value: 'database.collation()', module: 'Database' },
  { label: 'database.column', value: 'database.column()', module: 'Database' },
  { label: 'database.engine', value: 'database.engine()', module: 'Database' },
  { label: 'database.mongodbObjectId', value: 'database.mongodbObjectId()', module: 'Database' },
  { label: 'database.type', value: 'database.type()', module: 'Database' },

  // Datatype
  { label: 'datatype.boolean', value: 'datatype.boolean()', module: 'Datatype' },

  // Date
  { label: 'date.anytime', value: 'date.anytime()', module: 'Date' },
  { label: 'date.month', value: 'date.month()', module: 'Date' },
  { label: 'date.timeZone', value: 'date.timeZone()', module: 'Date' },
  { label: 'date.weekday', value: 'date.weekday()', module: 'Date' },

  // Finance
  { label: 'finance.accountName', value: 'finance.accountName()', module: 'Finance' },
  { label: 'finance.accountNumber', value: 'finance.accountNumber()', module: 'Finance' },
  { label: 'finance.bic', value: 'finance.bic()', module: 'Finance' },
  { label: 'finance.bitcoinAddress', value: 'finance.bitcoinAddress()', module: 'Finance' },
  { label: 'finance.creditCardCVV', value: 'finance.creditCardCVV()', module: 'Finance' },
  { label: 'finance.creditCardIssuer', value: 'finance.creditCardIssuer()', module: 'Finance' },
  { label: 'finance.creditCardNumber', value: 'finance.creditCardNumber()', module: 'Finance' },
  { label: 'finance.currency', value: 'finance.currency()', module: 'Finance' },
  { label: 'finance.currencyCode', value: 'finance.currencyCode()', module: 'Finance' },
  { label: 'finance.currencyName', value: 'finance.currencyName()', module: 'Finance' },
  { label: 'finance.currencyNumericCode', value: 'finance.currencyNumericCode()', module: 'Finance' },
  { label: 'finance.currencySymbol', value: 'finance.currencySymbol()', module: 'Finance' },
  { label: 'finance.ethereumAddress', value: 'finance.ethereumAddress()', module: 'Finance' },
  { label: 'finance.iban', value: 'finance.iban()', module: 'Finance' },
  { label: 'finance.litecoinAddress', value: 'finance.litecoinAddress()', module: 'Finance' },
  { label: 'finance.pin', value: 'finance.pin()', module: 'Finance' },
  { label: 'finance.routingNumber', value: 'finance.routingNumber()', module: 'Finance' },
  { label: 'finance.transactionDescription', value: 'finance.transactionDescription()', module: 'Finance' },
  { label: 'finance.transactionType', value: 'finance.transactionType()', module: 'Finance' },

  // Food
  { label: 'food.adjective', value: 'food.adjective()', module: 'Food' },
  { label: 'food.description', value: 'food.description()', module: 'Food' },
  { label: 'food.dish', value: 'food.dish()', module: 'Food' },
  { label: 'food.ethnicCategory', value: 'food.ethnicCategory()', module: 'Food' },
  { label: 'food.fruit', value: 'food.fruit()', module: 'Food' },
  { label: 'food.ingredient', value: 'food.ingredient()', module: 'Food' },
  { label: 'food.meat', value: 'food.meat()', module: 'Food' },
  { label: 'food.spice', value: 'food.spice()', module: 'Food' },
  { label: 'food.vegetable', value: 'food.vegetable()', module: 'Food' },

  // Git
  { label: 'git.branch', value: 'git.branch()', module: 'Git' },
  { label: 'git.commitEntry', value: 'git.commitEntry()', module: 'Git' },
  { label: 'git.commitMessage', value: 'git.commitMessage()', module: 'Git' },
  { label: 'git.commitSha', value: 'git.commitSha()', module: 'Git' },

  // Hacker
  { label: 'hacker.abbreviation', value: 'hacker.abbreviation()', module: 'Hacker' },
  { label: 'hacker.adjective', value: 'hacker.adjective()', module: 'Hacker' },
  { label: 'hacker.ingverb', value: 'hacker.ingverb()', module: 'Hacker' },
  { label: 'hacker.noun', value: 'hacker.noun()', module: 'Hacker' },
  { label: 'hacker.phrase', value: 'hacker.phrase()', module: 'Hacker' },
  { label: 'hacker.verb', value: 'hacker.verb()', module: 'Hacker' },

  // Image
  { label: 'image.avatar', value: 'image.avatar()', module: 'Image' },
  { label: 'image.avatarGitHub', value: 'image.avatarGitHub()', module: 'Image' },
  { label: 'image.dataUri', value: 'image.dataUri()', module: 'Image' },
  { label: 'image.url', value: 'image.url()', module: 'Image' },

  // Internet
  { label: 'internet.displayName', value: 'internet.displayName()', module: 'Internet' },
  { label: 'internet.domainName', value: 'internet.domainName()', module: 'Internet' },
  { label: 'internet.domainSuffix', value: 'internet.domainSuffix()', module: 'Internet' },
  { label: 'internet.domainWord', value: 'internet.domainWord()', module: 'Internet' },
  { label: 'internet.email', value: 'internet.email()', module: 'Internet' },
  { label: 'internet.emoji', value: 'internet.emoji()', module: 'Internet' },
  { label: 'internet.exampleEmail', value: 'internet.exampleEmail()', module: 'Internet' },
  { label: 'internet.httpMethod', value: 'internet.httpMethod()', module: 'Internet' },
  { label: 'internet.httpStatusCode', value: 'internet.httpStatusCode()', module: 'Internet' },
  { label: 'internet.ip', value: 'internet.ip()', module: 'Internet' },
  { label: 'internet.ipv4', value: 'internet.ipv4()', module: 'Internet' },
  { label: 'internet.ipv6', value: 'internet.ipv6()', module: 'Internet' },
  { label: 'internet.jwt', value: 'internet.jwt()', module: 'Internet' },
  { label: 'internet.jwtAlgorithm', value: 'internet.jwtAlgorithm()', module: 'Internet' },
  { label: 'internet.mac', value: 'internet.mac()', module: 'Internet' },
  { label: 'internet.port', value: 'internet.port()', module: 'Internet' },
  { label: 'internet.protocol', value: 'internet.protocol()', module: 'Internet' },
  { label: 'internet.url', value: 'internet.url()', module: 'Internet' },
  { label: 'internet.userAgent', value: 'internet.userAgent()', module: 'Internet' },
  { label: 'internet.username', value: 'internet.username()', module: 'Internet' },

  // Location
  { label: 'location.buildingNumber', value: 'location.buildingNumber()', module: 'Location' },
  { label: 'location.cardinalDirection', value: 'location.cardinalDirection()', module: 'Location' },
  { label: 'location.city', value: 'location.city()', module: 'Location' },
  { label: 'location.continent', value: 'location.continent()', module: 'Location' },
  { label: 'location.country', value: 'location.country()', module: 'Location' },
  { label: 'location.countryCode', value: 'location.countryCode()', module: 'Location' },
  { label: 'location.county', value: 'location.county()', module: 'Location' },
  { label: 'location.direction', value: 'location.direction()', module: 'Location' },
  { label: 'location.latitude', value: 'location.latitude()', module: 'Location' },
  { label: 'location.longitude', value: 'location.longitude()', module: 'Location' },
  { label: 'location.ordinalDirection', value: 'location.ordinalDirection()', module: 'Location' },
  { label: 'location.secondaryAddress', value: 'location.secondaryAddress()', module: 'Location' },
  { label: 'location.state', value: 'location.state()', module: 'Location' },
  { label: 'location.street', value: 'location.street()', module: 'Location' },
  { label: 'location.streetAddress', value: 'location.streetAddress()', module: 'Location' },
  { label: 'location.timeZone', value: 'location.timeZone()', module: 'Location' },
  { label: 'location.zipCode', value: 'location.zipCode()', module: 'Location' },

  // Lorem
  { label: 'lorem.lines', value: 'lorem.lines()', module: 'Lorem' },
  { label: 'lorem.paragraph', value: 'lorem.paragraph()', module: 'Lorem' },
  { label: 'lorem.sentence', value: 'lorem.sentence()', module: 'Lorem' },
  { label: 'lorem.slug', value: 'lorem.slug()', module: 'Lorem' },
  { label: 'lorem.text', value: 'lorem.text()', module: 'Lorem' },
  { label: 'lorem.word', value: 'lorem.word()', module: 'Lorem' },

  // Music
  { label: 'music.album', value: 'music.album()', module: 'Music' },
  { label: 'music.artist', value: 'music.artist()', module: 'Music' },
  { label: 'music.genre', value: 'music.genre()', module: 'Music' },
  { label: 'music.songName', value: 'music.songName()', module: 'Music' },

  // Number
  { label: 'number.bigInt', value: 'number.bigInt()', module: 'Number' },
  { label: 'number.binary', value: 'number.binary()', module: 'Number' },
  { label: 'number.float', value: 'number.float()', module: 'Number' },
  { label: 'number.hex', value: 'number.hex()', module: 'Number' },
  { label: 'number.int', value: 'number.int()', module: 'Number' },
  { label: 'number.octal', value: 'number.octal()', module: 'Number' },
  { label: 'number.romanNumeral', value: 'number.romanNumeral()', module: 'Number' },

  // Person
  { label: 'person.bio', value: 'person.bio()', module: 'Person' },
  { label: 'person.firstName', value: 'person.firstName()', module: 'Person' },
  { label: 'person.fullName', value: 'person.fullName()', module: 'Person' },
  { label: 'person.gender', value: 'person.gender()', module: 'Person' },
  { label: 'person.jobArea', value: 'person.jobArea()', module: 'Person' },
  { label: 'person.jobDescriptor', value: 'person.jobDescriptor()', module: 'Person' },
  { label: 'person.jobTitle', value: 'person.jobTitle()', module: 'Person' },
  { label: 'person.jobType', value: 'person.jobType()', module: 'Person' },
  { label: 'person.lastName', value: 'person.lastName()', module: 'Person' },
  { label: 'person.middleName', value: 'person.middleName()', module: 'Person' },
  { label: 'person.prefix', value: 'person.prefix()', module: 'Person' },
  { label: 'person.sex', value: 'person.sex()', module: 'Person' },
  { label: 'person.sexType', value: 'person.sexType()', module: 'Person' },
  { label: 'person.suffix', value: 'person.suffix()', module: 'Person' },
  { label: 'person.zodiacSign', value: 'person.zodiacSign()', module: 'Person' },

  // Phone
  { label: 'phone.imei', value: 'phone.imei()', module: 'Phone' },
  { label: 'phone.number', value: 'phone.number()', module: 'Phone' },

  // Science
  { label: 'science.chemicalElement', value: 'science.chemicalElement()', module: 'Science' },
  { label: 'science.unit', value: 'science.unit()', module: 'Science' },

  // String
  { label: 'string.alpha', value: 'string.alpha()', module: 'String' },
  { label: 'string.alphanumeric', value: 'string.alphanumeric()', module: 'String' },
  { label: 'string.binary', value: 'string.binary()', module: 'String' },
  { label: 'string.hexadecimal', value: 'string.hexadecimal()', module: 'String' },
  { label: 'string.nanoid', value: 'string.nanoid()', module: 'String' },
  { label: 'string.numeric', value: 'string.numeric()', module: 'String' },
  { label: 'string.octal', value: 'string.octal()', module: 'String' },
  { label: 'string.sample', value: 'string.sample()', module: 'String' },
  { label: 'string.symbol', value: 'string.symbol()', module: 'String' },
  { label: 'string.ulid', value: 'string.ulid()', module: 'String' },
  { label: 'string.uuid', value: 'string.uuid()', module: 'String' },

  // System
  { label: 'system.commonFileExt', value: 'system.commonFileExt()', module: 'System' },
  { label: 'system.commonFileName', value: 'system.commonFileName()', module: 'System' },
  { label: 'system.commonFileType', value: 'system.commonFileType()', module: 'System' },
  { label: 'system.cron', value: 'system.cron()', module: 'System' },
  { label: 'system.directoryPath', value: 'system.directoryPath()', module: 'System' },
  { label: 'system.fileExt', value: 'system.fileExt()', module: 'System' },
  { label: 'system.fileName', value: 'system.fileName()', module: 'System' },
  { label: 'system.filePath', value: 'system.filePath()', module: 'System' },
  { label: 'system.fileType', value: 'system.fileType()', module: 'System' },
  { label: 'system.mimeType', value: 'system.mimeType()', module: 'System' },
  { label: 'system.networkInterface', value: 'system.networkInterface()', module: 'System' },
  { label: 'system.semver', value: 'system.semver()', module: 'System' },

  // Vehicle
  { label: 'vehicle.bicycle', value: 'vehicle.bicycle()', module: 'Vehicle' },
  { label: 'vehicle.color', value: 'vehicle.color()', module: 'Vehicle' },
  { label: 'vehicle.fuel', value: 'vehicle.fuel()', module: 'Vehicle' },
  { label: 'vehicle.manufacturer', value: 'vehicle.manufacturer()', module: 'Vehicle' },
  { label: 'vehicle.model', value: 'vehicle.model()', module: 'Vehicle' },
  { label: 'vehicle.type', value: 'vehicle.type()', module: 'Vehicle' },
  { label: 'vehicle.vehicle', value: 'vehicle.vehicle()', module: 'Vehicle' },
  { label: 'vehicle.vin', value: 'vehicle.vin()', module: 'Vehicle' },
  { label: 'vehicle.vrm', value: 'vehicle.vrm()', module: 'Vehicle' },

  // Word
  { label: 'word.adjective', value: 'word.adjective()', module: 'Word' },
  { label: 'word.adverb', value: 'word.adverb()', module: 'Word' },
  { label: 'word.conjunction', value: 'word.conjunction()', module: 'Word' },
  { label: 'word.interjection', value: 'word.interjection()', module: 'Word' },
  { label: 'word.noun', value: 'word.noun()', module: 'Word' },
  { label: 'word.preposition', value: 'word.preposition()', module: 'Word' },
  { label: 'word.sample', value: 'word.sample()', module: 'Word' },
  { label: 'word.verb', value: 'word.verb()', module: 'Word' },
  { label: 'word.words', value: 'word.words()', module: 'Word' }
]

export const FAKER_MODULES = [...new Set(FAKER_METHODS.map(m => m.module))].sort()
