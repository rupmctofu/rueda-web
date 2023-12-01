type Card = {
  icon: string;
  html: string;
};

export type DirectionSection = {
  image: string;
  pretitle: string;
  title: string;
  subtitle: string;
  description: string;
  html: string | undefined;
  footer: string;
  doCards: Array<Card>;
  footerCards: Array<Card>;
};
