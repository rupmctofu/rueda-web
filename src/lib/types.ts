export type Card = {
  icon: string;
  html: string;
};

export type Direction = {
  image: string;
  pretitle: string;
  title: string;
  subtitle: string;
  description: string;
  date: string;
  html?: string;
  background: string;
  footer: string;
  doCards: Array<Card>;
  footerCards: Array<Card>;
};

export type DirectionCard = {
  background: string;
  image: string;
  title: string;
  label: string;
  html: string;
  footer: string;
};

export type TemazcalEvent = {
  date: string;
  title: string;
  description: string;
};

export type Temazcal = {
  image: string;
  title: string;
  subtitle: string;
  description: string;
  html: string;
  background: string;
  events: Array<TemazcalEvent>;
  benefitsCards: Array<string>;
  footer: string;
};

export type Maestria = {
  image: string;
  title: string;
  html: string;
  date: string;
  background: string;
  footer: {
    title: string;
    html: string;
  };
  doCards: Array<Card>;
};

export type Facilitador = {
  image: string;
  name: string;
  text: string;
};
