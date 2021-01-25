import React, { useState, useEffect, useContext } from "react";
import { GeneralData } from "../Context";
import { Refetch } from "../Context";
import axios from "axios";
import moment from "moment";
import Loader from "react-loader-spinner";
import localization from "moment/locale/pl";
import "../styles/Events.css";
import ChangePopup from "../helpers/ChangePopup";
import AddEvent from "../helpers/AddEvent";

moment.updateLocale("pl", localization);

function Participants() {
  const { userData } = useContext(GeneralData);
  const { refetch } = useContext(Refetch);
  // eslint-disable-next-line no-unused-vars
  const [domyKultury, setDomyKultury] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [allInfo, setAllInfo] = useState({});
  const [handleAdding, setHandleAdding] = useState(false);

  const serveParticipants = async ({ stanowisko }) => {
    let res = {
      wystawa: [],
      warsztat: [],
    };
    const { data: wydarzeniaR } = await axios("/api/wydarzenia");
    const { data: wystawyR } = await axios("/api/wystawy");
    const { data: warsztatyR } = await axios("/api/warsztaty");
    const all = [...wystawyR, ...warsztatyR];
    const { data: organizatorzy } = await axios("/api/organizacja_wydarzen");
    const or = {};

    let organizatorWydarzenia = all.map((el, index) => {
      return organizatorzy.filter((ev) => {
        return ev.id_wydarzenia === el.id;
      });
    });

    // eslint-disable-next-line array-callback-return
    organizatorWydarzenia.map((org) => {
      if (org.length !== 0) {
        // eslint-disable-next-line array-callback-return
        org.map((el) => {
          let {
            czas_trwania,
            data_wydarzenia,
            numer_sali,
            powierzchnia_sali,
            id_sali,
            id_wydarzenia,
            typ_wydarzenia,
            ...rest
          } = el;
          if (or[el.id_wydarzenia] === undefined) {
            or[el.id_wydarzenia] = [];
          }
          or[el.id_wydarzenia].push(rest);
        });
      }
    });

    console.log(or);

    await Promise.all(
      wydarzeniaR.map(async (event) => {
        let organizatorzy = [];
        for (const key in or) {
          if (event.id === parseInt(key)) {
            organizatorzy = or[key];
          }
        }

        let match = all.find((element) => element.id === event.id);

        const { data: uczestnicyLista } = await axios(
          `/api/uczestnicy?wydarzenie=${event.id}`
        );
        let final = { ...event, ...match, uczestnicyLista, organizatorzy };
        // console.log(final);
        res[event.typ].push(final);
      })
    )
    if (userData.stanowisko === "Organizator") {
      // console.log(userData.id);
      // eslint-disable-next-line array-callback-return
      Object.entries(res).map(([key, vals]) => {
        // console.log({ vals });
        // eslint-disable-next-line array-callback-return
        const filtred = vals.filter((el) => {
          if (el.organizatorzy.length !== 0) {
            return el.organizatorzy.filter((org) => {
              return org.id_pracownika === userData.id;
            });
          }
        });
        console.log(key, filtred);
        res[key] = filtred;
      });
    }
    return res;
  };

  useEffect(() => {
    async function fetchData() {
      const result = await axios("/api/domy_kultury/");
      setDomyKultury(result.data);
    }
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function serve() {
      const info = await serveParticipants(userData);
      setAllInfo(info);
      setDataLoaded(true);
    }
    serve();
    console.log("fetching for new data");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return (
    <div className="box">
      <div className="wrapper">
        <h2>Uczestnicy wydarzen:</h2>
        {userData.stanowisko === "Developer" ||
        userData.stanowisko === "Administrator" ? (
          <button
            className="classic_button_style"
            onClick={() => setHandleAdding(true)}
          >
            Dodaj wydarzenie
          </button>
        ) : (
          <></>
        )}
        {handleAdding && (
          <AddEvent handleActive={() => setHandleAdding(false)} />
        )}
        <div className="wydarzenia">
          {dataLoaded ? (
            Object.entries(allInfo).map(([key, events], i) => (
              <div className="event_group" key={i}>
                <h4>{`Rodzaj: ${key}`} </h4>
                <ul>
                  {events.map((event, i) => {
                    return <WydarzanieCard event={event} key={event.id} userData={userData} />;
                  })}
                </ul>
              </div>
            ))
          ) : (
            <div className="loader">
              <Loader type="ThreeDots" color="#2196f3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Uczestnik({ uczestnik, id, userData }) {
  const { refetch, setRefetch } = useContext(Refetch);
  const deleteParticipant = async () =>{
    const url = "/api/wydarzenia_uczestnika"
    const params = { 
      id_uczestnika: uczestnik.id, 
      id_wydarzenia: id
    }
    console.log(params);
    try {
      await axios.delete(url, { data: Object.assign({}, params), headers: {"Content-Type": "application/json"} });
      setRefetch(!refetch);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="participant">
      <p>
        {uczestnik ? uczestnik.imie : ""}
        {uczestnik ? ` ${uczestnik.nazwisko}` : ""}
      </p>
      <p>{uczestnik ? "Tel: " + uczestnik.telefon : ""}</p>
      <p>{uczestnik ? "Email: " + uczestnik.email : ""}</p>
      { (userData.stanowisko === "Developer")||(userData.stanowisko === "Administrator") ?
        <i className="las la-trash" style={{'color': 'red'}} onClick={deleteParticipant}></i>
        : <></>
      }
    </div>
  );
}
// eslint-disable-next-line no-unused-vars
const change = (e, setter) => {
  let { name, value } = e.target;
  if (name === "data_urodzenia" || name === "data") {
    setter((prevState) => ({
      ...prevState,
      [name]: moment.utc(value).toISOString(),
    }));
  } else {
    setter((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }
};

function WydarzanieCard({ event, userData }) {
  const serveUrl = () => {
    switch (event.typ) {
      case "wystawa":
        return `/api/wystawy?id=${event.id}`;
      case "warsztat":
        return `/api/warsztaty?id=${event.id}`;  
      default:
        return "";
    }
  };
  const [open, setOpen] = useState(false);
  let data = moment.utc(event.data).local("pl").format("LL");
  let godzina = moment.utc(event.data).format("HH:mm");

  const [haveP] = useState(event.uczestnicyLista.length !== 0);
  const [tooglePopup, setTooglePopup] = useState(false);
  return (
    <div className="event">
      {console.log()}
      <div className="basic_info">
        <div className="info">
          <h3>{event ? event.temat : ""}</h3>
          <p>
            {event.imie_wystawiajacego
              ? `${event.imie_wystawiajacego} ${event.nazwisko_wystawiajacego}`
              : `${event.imie_wykladowcy} ${event.nazwisko_wykladowcy}`}
          </p>
          <p className="sala">{`Numer sali: ${event.numer_sali}`}</p>
        </div>

        <div className="date">
          <p>{data}</p>
          <p>{godzina+" - "+((parseInt(godzina.toString().substring(0,2))+event.czas_trwania)>23 ? (parseInt(godzina.toString().substring(0,2))+event.czas_trwania) - 24 : (parseInt(godzina.toString().substring(0,2))+event.czas_trwania) )+godzina.toString().substring(2,5)}</p>
          <button
            onClick={() => setTooglePopup(true)}
            className="classic_button_style"
          >
            Zmień dane
          </button>
        </div>
      </div>

      <div className="participant_group">
        {open
          ? haveP
            ? event.uczestnicyLista.map((element) => {
                console.log(element);
                return <Uczestnik uczestnik={element} id={event.id} userData={userData} />;
              })
            : "nie jeszcze ma uczestników"
          : ""}
      </div>
      {open ? (
        <i className="las la-angle-up" onClick={() => setOpen(false)}></i>
      ) : (
        <i className="las la-angle-down" onClick={() => setOpen(true)}></i>
      )}
      {tooglePopup && (
        <ChangePopup
          index={event.id}
          data={event}
          popupHandler={() => setTooglePopup(false)}
          url={serveUrl()}
          typ={event.typ}
        />
      )}
    </div>
  );
}

export default Participants;
