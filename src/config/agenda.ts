import Agenda from "agenda";

let instance: Agenda | null = null;

export const getAgenda = (): Agenda => {
  if (!instance) {
    if (!process.env.DB_URL) {
      throw new Error("DB_URL environment variable is not set — cannot initialize Agenda");
    }
    instance = new Agenda({
      db: {
        address: process.env.DB_URL,
        collection: "agendaJobs",
      },
      processEvery: "30 seconds",
    });
  }
  return instance;
};
