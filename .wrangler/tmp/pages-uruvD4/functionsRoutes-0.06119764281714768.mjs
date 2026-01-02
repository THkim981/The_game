import { onRequest as __api_profile__id__best_time_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\profile\\[id]\\best-time.ts"
import { onRequest as __api_profile__id__reset_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\profile\\[id]\\reset.ts"
import { onRequest as __api_profile__id__save_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\profile\\[id]\\save.ts"
import { onRequest as __api_profile__id__snapshots_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\profile\\[id]\\snapshots.ts"
import { onRequest as __api_profile__id__stats_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\profile\\[id]\\stats.ts"
import { onRequest as __api_login_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\login.ts"
import { onRequest as __api_logout_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\logout.ts"
import { onRequest as __api_ranking_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\ranking.ts"
import { onRequest as __api_register_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\register.ts"
import { onRequest as __api_score_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\score.ts"
import { onRequest as __api_verify_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\api\\verify.ts"
import { onRequest as __ranking_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\ranking.ts"
import { onRequest as __score_ts_onRequest } from "C:\\Users\\kimtaehun\\source\\repos\\The_Game\\functions\\score.ts"

export const routes = [
    {
      routePath: "/api/profile/:id/best-time",
      mountPath: "/api/profile/:id",
      method: "",
      middlewares: [],
      modules: [__api_profile__id__best_time_ts_onRequest],
    },
  {
      routePath: "/api/profile/:id/reset",
      mountPath: "/api/profile/:id",
      method: "",
      middlewares: [],
      modules: [__api_profile__id__reset_ts_onRequest],
    },
  {
      routePath: "/api/profile/:id/save",
      mountPath: "/api/profile/:id",
      method: "",
      middlewares: [],
      modules: [__api_profile__id__save_ts_onRequest],
    },
  {
      routePath: "/api/profile/:id/snapshots",
      mountPath: "/api/profile/:id",
      method: "",
      middlewares: [],
      modules: [__api_profile__id__snapshots_ts_onRequest],
    },
  {
      routePath: "/api/profile/:id/stats",
      mountPath: "/api/profile/:id",
      method: "",
      middlewares: [],
      modules: [__api_profile__id__stats_ts_onRequest],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_login_ts_onRequest],
    },
  {
      routePath: "/api/logout",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_logout_ts_onRequest],
    },
  {
      routePath: "/api/ranking",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_ranking_ts_onRequest],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_register_ts_onRequest],
    },
  {
      routePath: "/api/score",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_score_ts_onRequest],
    },
  {
      routePath: "/api/verify",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_verify_ts_onRequest],
    },
  {
      routePath: "/ranking",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__ranking_ts_onRequest],
    },
  {
      routePath: "/score",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__score_ts_onRequest],
    },
  ]