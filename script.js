const cities = {
  toronto: { name: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832 },
  vancouver: { name: "Vancouver", country: "Canada", latitude: 49.2827, longitude: -123.1207 },
  montreal: { name: "Montréal", country: "Canada", latitude: 45.5019, longitude: -73.5674 }
};

const weatherCard = document.querySelector("#weather-card");
const statusText = document.querySelector("#status");
const localTime = document.querySelector("#local-time");
const place = document.querySelector("#place");
const temperature = document.querySelector("#temperature");
const feelsLike = document.querySelector("#feels-like");
const humidity = document.querySelector("#humidity");
const wind = document.querySelector("#wind");
const rain = document.querySelector("#rain");
const condition = document.querySelector("#condition");
const conditionIcon = document.querySelector("#condition-icon");
const weatherNote = document.querySelector("#weather-note");
const refreshButton = document.querySelector("#refresh-button");
const precipitationLayer = document.querySelector("#precipitation");
const cityButtons = document.querySelectorAll(".city-button");

let selectedCity = "toronto";

const weatherCodes = {
  0: { label: "Clear sky", icon: "☀", group: "clear" },
  1: { label: "Mainly clear", icon: "◐", group: "clear" },
  2: { label: "Partly cloudy", icon: "◒", group: "cloudy" },
  3: { label: "Overcast", icon: "☁", group: "cloudy" },
  45: { label: "Foggy", icon: "≋", group: "cloudy" },
  48: { label: "Icy fog", icon: "≋", group: "cloudy" },
  51: { label: "Light drizzle", icon: "☂", group: "rain" },
  53: { label: "Drizzle", icon: "☂", group: "rain" },
  55: { label: "Heavy drizzle", icon: "☂", group: "rain" },
  61: { label: "Light rain", icon: "☂", group: "rain" },
  63: { label: "Rain", icon: "☂", group: "rain" },
  65: { label: "Heavy rain", icon: "☂", group: "rain" },
  71: { label: "Light snow", icon: "✣", group: "snow" },
  73: { label: "Snow", icon: "✣", group: "snow" },
  75: { label: "Heavy snow", icon: "✣", group: "snow" },
  77: { label: "Snow grains", icon: "✣", group: "snow" },
  80: { label: "Rain showers", icon: "☂", group: "rain" },
  81: { label: "Rain showers", icon: "☂", group: "rain" },
  82: { label: "Heavy showers", icon: "☂", group: "rain" },
  85: { label: "Snow showers", icon: "✣", group: "snow" },
  86: { label: "Heavy snow showers", icon: "✣", group: "snow" },
  95: { label: "Thunderstorm", icon: "ϟ", group: "storm" },
  96: { label: "Thunderstorm with hail", icon: "ϟ", group: "storm" },
  99: { label: "Severe thunderstorm", icon: "ϟ", group: "storm" }
};

function getWeatherDescription(code) {
  return weatherCodes[code] || { label: "Changing weather", icon: "○", group: "cloudy" };
}

function getAdvice(current, description) {
  if (description.group === "storm") return "A storm is active. Stay inside if possible and keep an eye on local alerts.";
  if (description.group === "snow") return "Snow is shaping the city today. Wear warm layers and leave extra time for the trip.";
  if (description.group === "rain") return current.precipitation > 2
    ? "Steady rain is falling. Bring a proper umbrella and waterproof shoes."
    : "A little rain is in the air. A light jacket or small umbrella should be enough.";
  if (current.apparent_temperature <= -5) return "It feels sharply cold outside. Gloves, a warm coat, and a scarf will help.";
  if (current.apparent_temperature < 8) return "The air feels cool. Add a warm layer before heading out.";
  if (current.apparent_temperature > 28) return "It feels hot today. Choose light clothing and remember to drink water.";
  if (current.wind_speed_10m > 30) return "It is mild but windy. Secure loose items and choose a wind-resistant layer.";
  return "Conditions feel comfortable. It is a good moment to step outside and look up.";
}

function createPrecipitation(group) {
  precipitationLayer.replaceChildren();
  if (!['rain', 'snow', 'storm'].includes(group)) return;

  const count = group === 'snow' ? 45 : 32;
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const drop = document.createElement("span");
    drop.className = group === "snow" ? "drop snowflake" : "drop";
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * -8}s`;
    drop.style.animationDuration = group === "snow"
      ? `${7 + Math.random() * 6}s`
      : `${0.8 + Math.random() * 0.8}s`;
    fragment.append(drop);
  }

  precipitationLayer.append(fragment);
}

function updateInterface(data, city) {
  const current = data.current;
  const description = getWeatherDescription(current.weather_code);
  const isDay = current.is_day === 1;

  document.body.dataset.weather = description.group;
  document.body.dataset.day = String(isDay);
  place.textContent = `${city.name}, ${city.country}`;
  temperature.textContent = Math.round(current.temperature_2m);
  feelsLike.textContent = Math.round(current.apparent_temperature);
  humidity.textContent = Math.round(current.relative_humidity_2m);
  wind.textContent = Math.round(current.wind_speed_10m);
  rain.textContent = Number(current.precipitation).toFixed(1);
  condition.textContent = description.label;
  conditionIcon.textContent = isDay ? description.icon : (description.group === "clear" ? "☾" : description.icon);
  weatherNote.textContent = getAdvice(current, description);
  localTime.textContent = `Local reading · ${current.time.replace("T", " ")}`;
  statusText.innerHTML = "<span></span> Live data received";

  createPrecipitation(description.group);
}

async function loadWeather(cityKey = selectedCity) {
  const city = cities[cityKey];
  selectedCity = cityKey;
  weatherCard.classList.add("loading");
  weatherCard.classList.remove("error");
  weatherCard.setAttribute("aria-busy", "true");
  statusText.innerHTML = "<span></span> Connecting to live weather…";
  refreshButton.disabled = true;

  const parameters = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    timezone: "auto"
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${parameters}`);
    if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);

    const data = await response.json();
    if (!data.current) throw new Error("Weather data is incomplete");
    updateInterface(data, city);
  } catch (error) {
    console.error(error);
    weatherCard.classList.add("error");
    statusText.innerHTML = "<span></span> Live data unavailable";
    localTime.textContent = "Please check your connection and try again.";
    condition.textContent = "Could not load weather";
    conditionIcon.textContent = "!";
    weatherNote.textContent = "The page is ready, but the public API did not respond. Press “Refresh data” to try again.";
  } finally {
    weatherCard.classList.remove("loading");
    weatherCard.setAttribute("aria-busy", "false");
    refreshButton.disabled = false;
  }
}

cityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    cityButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
    loadWeather(button.dataset.city);
  });
});

refreshButton.addEventListener("click", () => loadWeather(selectedCity));

loadWeather();
