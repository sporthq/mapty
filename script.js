'use strict';

// 238 Menaging workout data
class Workout {
  data = new Date();
  id = (new Date().getTime() + '').slice(-6);
  // clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km odległość
    this.duration = duration; // in min długość czasu
  }

  // Metoda tworząca opis ćwiczenia
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // type[0] -> po to żeby napisać 1 literę z dużej
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.data.getMonth()]
    } ${this.data.getDate()}`;
  }

  // click() {
  //   this.clicks++;
  // }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDeleteAll = document.querySelector('.btn__delete');
const btnMenu = document.querySelector('.workout__menu--btn');
const map = document.getElementById('map');
// const sidebar = document.querySelector('.sidebar')

// 237. Refactoring for project Architecture 0:39

class App {
  #mapZoomLevel = 13;
  #map;
  #mapEvent;
  #workouts = [];
  #editMode = false;
  #curWorkout;

  constructor() {
    // this._getPosition();
    this._loadMap({ coords: { latitude: 52.22977, longitude: 21.01178 } });
    // Pobieranie danych z local storage
    this._getLocalStorages();

    // this.newWorkoutSubmit = this._newWorkout.bind(this);
    // form.addEventListener('submit', this.newWorkoutSubmit);

    map.addEventListener('click', () => {
      this.#editMode = false;
      inputDistance.value = '';
      inputDuration.value = '';
      inputCadence.value = '';
      inputElevation.value = '';
      inputType.value = 'running';
    });
    // 235 Rendering workout input form 12;16 -> zmiana input type
    //  Nadajemy listenera na "zmianę "
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // pokazd menu edycji
    containerWorkouts.addEventListener('click', this._showMenu.bind(this));

    //edytcja workout'u
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));

    //wysanie workou'u

    // this._editWorkoutSubmit = this._submitEdit.bind(this);
    // form.addEventListener('submit', this._editWorkoutSubmit);

    // usuwamy jeden
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    // containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    // choose who event have edit mode
    form.addEventListener('submit', this._submitWorkout.bind(this));
    // usuwamy wszystko
    btnDeleteAll.addEventListener('click', this.reset);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        // 1 parametr funkcja -> co robimy kiedy mamy współrzędne -> ładujemy mapę
        this._loadMap.bind(this),
        // 2 parametr co robimy -> kiedy nie ma pozycji
        function () {
          alert('Nie moge pobrać Twojej pozycji');
        }
      );
    console.log(this.#map);
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // wyświetlamy marker dopiero po załadowaniu mapy
    this.#workouts.forEach(work => this._rednerWorkoutMarker(work));
  }
  _showForm(mapE) {
    // mapEvent - Event gdzie klikneliśmy
    // usuwa klase hidden -> pokazuje formularz
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    console.log('this is funcion show form');
  }
  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    // Wybieramy najbliższego rodzica elementu oraz dodajemy togla
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _crateNewWorkout() {
    form.classList.toggle('hidden');
  }

  _newWorkout(e) {
    // form.removeEventListener('submit', this._editWorkoutSubmit);

    // funkcja która sprawdza dowolną liczbę argumentów czy są liczbami:
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // usuwamy domyśne zachowanie formularza czyli przełdowywanie strony
    e.preventDefault();

    // Pobrać dane z formularza

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const { lat, lng } = this.#mapEvent.latlng;

    let workout;
    // Jeśli mamy bieganie stworzyć obiekt bieganie

    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Sprwdzić czy wartości są poprawne
      if (
        !validInputs(cadence, distance, duration) ||
        !allPositive(cadence, distance, duration)
      )
        return alert('Musisz podać liczby większe od 0');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // Jeśli mamy jazdę rowerem obiekt cycling

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !validInputs(elevationGain, distance, duration) ||
        !allPositive(distance, duration)
      )
        return alert('Musisz podać liczby większe od 0');

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }
    // Dodać nowy obiekt do tablicy workout
    this.#workouts.push(workout);
    // Render workout marker na mapie
    this._rednerWorkoutMarker(workout);
    // Wyrenderować na liście
    this._renderWorkout(workout);
    // Ukryć formularz +  Czyścimy inputy
    this._hideForm();
    // Zapisać trening w local storage
    this._setLocalStorage();

    // console.log(this.#workouts);
  }

  _rednerWorkoutMarker(workout) {
    if (!this.#editMode) {
      // Tworzymy market na mapie
      L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,

            className: `${workout.type}-popup`,
          })
        )
        .setPopupContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`
        )
        .openPopup();
    }
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class="workout__title">
           <h3 class="workout__title--text"> ${workout.description}</h3>
           <button class="workout__menu--btn">...</button>
            <div class="workout__menu--wrap workout__menu--wrap-hidden ">
              <button data-id="${
                workout.id
              }" class="workout__menu--btn-opt workout__menu--btn-edit">edit</button>
              <button data-id="${
                workout.id
              }" class="workout__menu--btn-opt workout__menu--btn-delete" >delete</button>
            </div>
          </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>


    `;

    if (workout.type === 'running')
      html += `
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
      `;

    if (workout.type === 'cycling')
      html += `
    <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
    </div>
  </li> 
 
    `;

    btnDeleteAll.classList.remove('btn__delete--hidden');
    form.insertAdjacentHTML('afterend', html);
  }

  // 241 Move to marker on click 2:51
  _moveToPopup(e) {
    // potrzebuje e -> event ponieważ musimy dopasować element, którego szukamy
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(el => el.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 1,
    });

    // workout.click();
    // console.log(workout.clicks);
  }

  // 242 Working with local storage 2:40
  _setLocalStorage() {
    // Tworzymy local strorage 1 parametr name(key): workout, 2 parametr(klucz)
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorages() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      workout =
        workout.type === 'running'
          ? Object.setPrototypeOf(workout, Running.prototype)
          : Object.setPrototypeOf(workout, Cycling.prototype);

      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _showMenu(e) {
    const btn = e.target.closest('.workout__menu--btn');
    if (!btn) return;
    const menu = btn.nextElementSibling;
    menu.classList.toggle('workout__menu--wrap-hidden');
  }

  _submitWorkout(e) {
    if (!this.#editMode) {
      this._newWorkout(e);
    } else {
      this._submitEdit(e);
    }
  }
  _editWorkout(e) {
    // e.preventDefault()
    const btnEdit = e.target.closest('.workout__menu--btn-edit');
    if (!btnEdit) return;

    const menuWrap = btnEdit.parentElement;
    if (!menuWrap) return;
    menuWrap.classList.toggle('workout__menu--wrap-hidden');

    form.classList.remove('hidden');

    inputDistance.focus();
    const workout = this.#workouts.find(el => el.id === btnEdit.dataset.id);

    // pobranie inputów z workout'u
    inputDuration.value = workout.duration;
    inputDistance.value = workout.distance;
    inputCadence.value = workout.cadence;
    inputElevation.value = workout.elevationGain;
    inputType.value = workout.type;

    if (workout.type === 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputElevation.value = '';
    } else {
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.value = '';
    }

    // form.removeEventListener('submit', this.newWorkoutSubmit);

    console.log(workout.id);
    console.log(this.#workouts);
    this.#editMode = true;

    const btn = document.createElement('button');

    btn.innerHTML = `<button class='btn_id' data-set=${workout.id}></button>`;
    btn.style.display = 'none';
    form.append(btn);
  }

  _submitEdit(e) {
    e.preventDefault();

    const btnId = document.querySelector('.btn_id');
    console.log(btnId.dataset.set);
    console.log(e.target);
    // prettier-ignore
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December',];

    // funkcja która sprawdza dowolną liczbę argumentów czy są liczbami:
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // usuwamy domyśne zachowanie formularza czyli przełdowywanie strony

    let currentWork = this.#workouts.find(
      work => work.id === btnId.dataset.set
    );

    const editWorkoutEl = document.querySelector('.workout');
    editWorkoutEl.style.display = 'none';
    console.log(editWorkoutEl);

    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const type = inputType.value;

    // if (!distance) return;
    // const editCurrenWork = currentWork;
    const editCurrenWork = Object.assign({}, currentWork);

    const data = new Date(editCurrenWork.data);
    if (!data) return;
    console.log(data.getMonth());
    editCurrenWork.distance = distance;
    editCurrenWork.duration = duration;
    editCurrenWork.type = type;
    if (type === 'cycling') {
      editCurrenWork.elevationGain = +inputElevation.value;
      // editCurrenWork.pace =  duration / distance;
      editCurrenWork.speed = distance / (duration / 60);
      editCurrenWork.description = `${editCurrenWork.type[0].toUpperCase()}${editCurrenWork.type.slice(
        1
      )} on  ${months[data.getMonth()]} ${data.getDate()}`;
    }
    if (type === 'running') {
      editCurrenWork.cadence = +inputCadence.value;
      editCurrenWork.pace = duration / distance;

      editCurrenWork.description = `${editCurrenWork.type[0].toUpperCase()}${editCurrenWork.type.slice(
        1
      )} on ${months[data.getMonth()]}  ${data.getDate()}`;

      if (
        !validInputs(
          editCurrenWork.cadence,
          editCurrenWork.distance,
          editCurrenWork.duration
        ) ||
        !allPositive(
          editCurrenWork.cadence,
          editCurrenWork.distance,
          editCurrenWork.duration
        )
      )
        return alert('Musisz podać liczby większe od 0');

      console.log('jest git');
      const curIndex = this.#workouts.findIndex(
        el => el.id === editCurrenWork.id
      );

      // this.#workouts.splice(curIndex, 1, currentWork);
      if (curIndex !== -1) {
        this.#workouts[curIndex] = editCurrenWork;
      }
      this.#workouts.forEach(el => {
        this._rednerWorkoutMarker(el);
      });

      this._renderWorkout(editCurrenWork);
      this._setLocalStorage();
    }

    // location.reload()
  }
  _deleteWorkout(e) {
    const btnDelete = e.target.closest('.workout__menu--btn-delete');
    if (!btnDelete) return;
    // console.log(btnDelete);
    const workout = this.#workouts.find(el => el.id === btnDelete.dataset.id);
    const id = workout.id;
    // console.log(id);
    // const index = this.#workouts.findIndex(function (work) {
    //   return work.id === id;
    // });
    // console.log(index);

    // this.#workouts.splice(index, 1);
    // // location.reload();

    // console.log(app);
    // // console.table(this.#workouts);

    const items = JSON.parse(localStorage.getItem('workouts'));
    const workoutId = items.filter(el => el.id !== workout.id);
    localStorage.setItem('workouts', JSON.stringify(workoutId));
    location.reload();
  }
}

const app = new App();

// dodatkowe zadania:

//* 1.Edit workout
//* 2.Delete workout
//* 3.Delete all workout

// 4.Sortowanie np po dystansie lub długości
//? sortowanie tablicy eazy
//* 5.Jeszcze raz pobranie z local storage danych i zrobienie żeby dziedziczyły po running itd
//? Jak zrobić: 19:40 242. Working with local storage
// 6.Realistyczne komunikaty o błędach i wiadomości potwierdzające
// 7.Pokazać wszystkie treningi biblioteka leaflet
// 8.Rysowanie lini i kształtów

// po następnej sekcji:
// 9.Wyszukiwanie lokalizacji po jej wpisaniu
// 10.Wyświetlanie pogody i czasu
