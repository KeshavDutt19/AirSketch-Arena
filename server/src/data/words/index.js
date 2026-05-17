import { fruits } from "./fruits.js";
import { vegetables } from "./vegetables.js";
import { animals } from "./animals.js";
import { countries } from "./countries.js";
import { cars } from "./cars.js";
import { carLogos } from "./carLogos.js";
import { sports } from "./sports.js";
import { movies } from "./movies.js";
import { cartoons } from "./cartoons.js";
import { brands } from "./brands.js";
import { food } from "./food.js";
import { objects } from "./objects.js";
import { technology } from "./technology.js";
import { jobs } from "./jobs.js";
import { games } from "./games.js";
import { superheroes } from "./superheroes.js";
import { emojis } from "./emojis.js";
import { clothing } from "./clothing.js";
import { nature } from "./nature.js";
import { places } from "./places.js";
import { instruments } from "./instruments.js";

export const wordCategories = [
  fruits,
  vegetables,
  animals,
  countries,
  cars,
  carLogos,
  sports,
  movies,
  cartoons,
  brands,
  food,
  objects,
  technology,
  jobs,
  games,
  superheroes,
  emojis,
  clothing,
  nature,
  places,
  instruments
];

export const wordThemes = [
  { value: "all", label: "Random All" },
  ...wordCategories.map((category) => ({ value: category.theme, label: category.category }))
];
