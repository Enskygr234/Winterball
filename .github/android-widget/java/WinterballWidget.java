package com.enskygr234.winterball;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

/**
 * Ana ekran widget'ı: favori takımın canlı, son ya da sıradaki maçını gösterir.
 * Takım bilgisini uygulama "CapacitorStorage" tercihlerine "widget.team" anahtarıyla yazar.
 */
public class WinterballWidget extends AppWidgetProvider {

    static final String ACTION_REFRESH = "com.enskygr234.winterball.WIDGET_REFRESH";
    private static final String API = "https://site.api.espn.com/apis/site/v2/sports/soccer/";

    private static final Map<String, String> LEAGUES = new HashMap<>();
    private static final Map<String, String> TR = new HashMap<>();
    static {
        LEAGUES.put("tur.1", "Süper Lig"); LEAGUES.put("tur.2", "1. Lig");
        LEAGUES.put("uefa.champions", "Şampiyonlar Ligi"); LEAGUES.put("uefa.europa", "Avrupa Ligi");
        LEAGUES.put("uefa.europa.conf", "Konferans Ligi"); LEAGUES.put("uefa.nations", "Uluslar Ligi");
        LEAGUES.put("fifa.worldq.uefa", "Dünya Kupası Elemeleri"); LEAGUES.put("eng.1", "Premier Lig");
        LEAGUES.put("esp.1", "La Liga"); LEAGUES.put("ita.1", "Serie A"); LEAGUES.put("ger.1", "Bundesliga");
        LEAGUES.put("fra.1", "Ligue 1"); LEAGUES.put("ned.1", "Eredivisie"); LEAGUES.put("por.1", "Liga Portugal");

        String[] tr = {
            "Besiktas", "Beşiktaş", "Besiktas JK", "Beşiktaş", "Fenerbahce", "Fenerbahçe", "Fenerbahce SK", "Fenerbahçe",
            "Istanbul Basaksehir", "Başakşehir", "Basaksehir", "Başakşehir", "Istanbul BB", "Başakşehir",
            "Goztepe", "Göztepe", "Kasimpasa", "Kasımpaşa", "Eyupspor", "Eyüpspor", "Genclerbirligi", "Gençlerbirliği",
            "Caykur Rizespor", "Çaykur Rizespor", "Rizespor", "Çaykur Rizespor", "Corum FK", "Çorum FK",
            "Fatih Karagumruk", "Fatih Karagümrük", "Karagumruk", "Karagümrük", "Ankaragucu", "Ankaragücü",
            "Istanbulspor", "İstanbulspor", "Bandirmaspor", "Bandırmaspor", "Umraniyespor", "Ümraniyespor",
            "Keciorengucu", "Keçiörengücü", "Igdir FK", "Iğdır FK", "Sariyer", "Sarıyer",
            "Turkey", "Türkiye", "Turkiye", "Türkiye", "Bayern Munich", "Bayern Münih", "Inter Milan", "Inter", "AC Milan", "Milan"
        };
        for (int i = 0; i < tr.length; i += 2) TR.put(tr[i], tr[i + 1]);
    }

    private static final String[] GUN = {"Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"};
    private static final String[] AY = {"Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"};

    // ---------------- Yaşam döngüsü ----------------

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        refreshAsync(ctx);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) refreshAsync(ctx);
    }

    @Override
    public void onDisabled(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(refreshIntent(ctx, 2));
    }

    /** Uygulamadan çağrılır: widget'ı hemen yenile. */
    public static void requestUpdate(Context ctx) {
        Intent i = new Intent(ctx, WinterballWidget.class).setAction(ACTION_REFRESH);
        ctx.sendBroadcast(i);
    }

    private void refreshAsync(Context ctx) {
        final PendingResult pr = goAsync();
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try { update(app); } catch (Throwable ignored) { }
            finally { pr.finish(); }
        }).start();
    }

    private static PendingIntent refreshIntent(Context ctx, int code) {
        Intent i = new Intent(ctx, WinterballWidget.class).setAction(ACTION_REFRESH);
        return PendingIntent.getBroadcast(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openAppIntent(Context ctx) {
        Intent i = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    // ---------------- Veri ----------------

    private static class Side { String id, name, logo, score; boolean winner; }
    private static class Match {
        String id, league, state = "pre", stateName = "", clock = "", detail = "";
        long time;
        Side home = new Side(), away = new Side();
    }

    private static void update(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, WinterballWidget.class));
        if (ids == null || ids.length == 0) return;

        SharedPreferences sp = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = sp.getString("widget.team", null);
        if (raw == null) {
            push(ctx, mgr, ids, message(ctx, "⭐ Uygulamada bir takımı favorile,\nmaçı burada görünsün."));
            return;
        }

        String teamId, teamName, league;
        try {
            JSONObject t = new JSONObject(raw);
            teamId = t.getString("id");
            teamName = t.optString("name", "");
            league = t.optString("league", "tur.1");
        } catch (Exception e) {
            push(ctx, mgr, ids, message(ctx, "⭐ Uygulamada bir takımı favorile,\nmaçı burada görünsün."));
            return;
        }

        List<Match> all = new ArrayList<>();
        boolean anyOk = false;
        for (String q : new String[]{"", "?fixture=true"}) {
            try {
                JSONObject j = getJSON(API + league + "/teams/" + teamId + "/schedule" + q);
                anyOk = true;
                JSONArray evs = j.optJSONArray("events");
                if (evs == null) continue;
                for (int i = 0; i < evs.length(); i++) {
                    Match m = parse(evs.getJSONObject(i), league);
                    if (m != null && !contains(all, m.id)) all.add(m);
                }
            } catch (Exception ignored) { }
        }
        if (!anyOk) {
            // İnternet yoksa eski görüntü kalsın, sadece altına not düşelim
            RemoteViews v = baseViews(ctx);
            v.setTextViewText(R.id.wb_updated, "Bağlantı yok · " + hm(System.currentTimeMillis()));
            mgr.partiallyUpdateAppWidget(ids, v);
            return;
        }

        long now = System.currentTimeMillis();
        Match live = null, last = null, next = null;
        for (Match m : all) {
            if ("in".equals(m.state)) { live = m; break; }
            if ("post".equals(m.state)) { if (last == null || m.time > last.time) last = m; }
            else if (next == null || m.time < next.time) next = m;
        }
        Match show;
        if (live != null) show = live;
        else if (next != null && next.time <= now + 10 * 60000L) show = next;                 // başlamak üzere / yeni başlamış
        else if (last != null && now - last.time < 8 * 3600000L) show = last;                  // bugün biten maç bir süre kalsın
        else if (next != null) show = next;
        else show = last;

        if (show == null) {
            push(ctx, mgr, ids, message(ctx, (teamName.isEmpty() ? "Takımın" : teamName) + " için\nmaç bulunamadı."));
            return;
        }

        // Maç saatine yakınsa takvim yerine canlı özetten güncel skoru al
        if (Math.abs(now - show.time) < 3 * 3600000L || "in".equals(show.state)) {
            try {
                JSONObject s = getJSON(API + show.league + "/summary?event=" + show.id);
                JSONObject comp = s.getJSONObject("header").getJSONArray("competitions").getJSONObject(0);
                JSONObject ev = new JSONObject();
                ev.put("id", show.id);
                ev.put("date", comp.optString("date"));
                JSONArray arr = new JSONArray(); arr.put(comp);
                ev.put("competitions", arr);
                Match fresh = parse(ev, show.league);
                if (fresh != null) { if (fresh.time == 0) fresh.time = show.time; show = fresh; }
            } catch (Exception ignored) { }
        }

        push(ctx, mgr, ids, matchViews(ctx, show));
        scheduleNext(ctx, show);
    }

    private static boolean contains(List<Match> l, String id) {
        for (Match m : l) if (m.id.equals(id)) return true;
        return false;
    }

    private static Match parse(JSONObject ev, String league) {
        try {
            Match m = new Match();
            m.id = ev.getString("id");
            m.league = league;
            m.time = parseDate(ev.optString("date", ""));
            JSONObject comp = ev.getJSONArray("competitions").getJSONObject(0);
            if (m.time == 0) m.time = parseDate(comp.optString("date", ""));
            JSONObject st = comp.optJSONObject("status");
            if (st == null) st = ev.optJSONObject("status");
            if (st != null) {
                JSONObject type = st.optJSONObject("type");
                if (type != null) {
                    m.state = type.optString("state", "pre");
                    m.stateName = type.optString("name", "");
                    m.detail = type.optString("shortDetail", type.optString("detail", ""));
                }
                m.clock = st.optString("displayClock", "");
            }
            JSONArray cs = comp.getJSONArray("competitors");
            for (int i = 0; i < cs.length(); i++) {
                JSONObject c = cs.getJSONObject(i);
                String ha = c.optString("homeAway", i == 0 ? "home" : "away");
                Side s = "away".equals(ha) ? m.away : m.home;
                JSONObject t = c.optJSONObject("team");
                if (t != null) {
                    s.id = t.optString("id");
                    String n = t.optString("shortDisplayName", t.optString("displayName", "?"));
                    s.name = TR.containsKey(n) ? TR.get(n) : n;
                    s.logo = t.optString("logo", "");
                    JSONArray logos = t.optJSONArray("logos");
                    if (s.logo.isEmpty() && logos != null && logos.length() > 0) s.logo = logos.getJSONObject(0).optString("href", "");
                }
                Object sc = c.opt("score");
                if (sc instanceof JSONObject) s.score = ((JSONObject) sc).optString("displayValue", null);
                else if (sc != null && !JSONObject.NULL.equals(sc)) s.score = String.valueOf(sc);
                if (s.score != null && s.score.isEmpty()) s.score = null;
                s.winner = c.optBoolean("winner", false);
            }
            return m;
        } catch (Exception e) {
            return null;
        }
    }

    private static long parseDate(String s) {
        if (s == null || s.isEmpty()) return 0;
        String[] fmts = {"yyyy-MM-dd'T'HH:mm'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd'T'HH:mmXXX", "yyyy-MM-dd'T'HH:mm:ssXXX"};
        for (String f : fmts) {
            try {
                SimpleDateFormat df = new SimpleDateFormat(f, Locale.US);
                df.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date d = df.parse(s);
                if (d != null) return d.getTime();
            } catch (Exception ignored) { }
        }
        return 0;
    }

    private static JSONObject getJSON(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(5000);
        c.setReadTimeout(6000);
        c.setRequestProperty("Accept", "application/json");
        try {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            try (InputStream in = c.getInputStream()) {
                return new JSONObject(new String(readAll(in), "UTF-8"));
            }
        } finally { c.disconnect(); }
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toByteArray();
    }

    /** Takım logosunu indirir; bir kez indirileni önbellekten kullanır. */
    private static Bitmap logo(Context ctx, Side s) {
        if (s.logo == null || s.logo.isEmpty()) return null;
        File f = new File(ctx.getCacheDir(), "wb_logo_" + (s.id != null ? s.id : Integer.toHexString(s.logo.hashCode())) + ".png");
        try {
            if (!f.exists() || f.length() == 0) {
                HttpURLConnection c = (HttpURLConnection) new URL(s.logo).openConnection();
                c.setConnectTimeout(4000);
                c.setReadTimeout(5000);
                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(f)) {
                    out.write(readAll(in));
                } finally { c.disconnect(); }
            }
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(f.getPath(), o);
            int sample = 1;
            while (Math.max(o.outWidth, o.outHeight) / (sample * 2) >= 128) sample *= 2;
            o = new BitmapFactory.Options();
            o.inSampleSize = sample;
            Bitmap b = BitmapFactory.decodeFile(f.getPath(), o);
            if (b == null) { f.delete(); return null; }
            return b;
        } catch (Exception e) {
            f.delete();
            return null;
        }
    }

    // ---------------- Görünüm ----------------

    private static RemoteViews baseViews(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_winterball);
        v.setOnClickPendingIntent(R.id.wb_root, openAppIntent(ctx));
        v.setOnClickPendingIntent(R.id.wb_refresh, refreshIntent(ctx, 3));
        return v;
    }

    private static RemoteViews message(Context ctx, String text) {
        RemoteViews v = baseViews(ctx);
        v.setViewVisibility(R.id.wb_content, View.GONE);
        v.setViewVisibility(R.id.wb_msg, View.VISIBLE);
        v.setTextViewText(R.id.wb_msg, text);
        v.setTextViewText(R.id.wb_league, "⚽ Winterball");
        v.setTextViewText(R.id.wb_status, "");
        v.setTextViewText(R.id.wb_updated, "Güncellendi " + hm(System.currentTimeMillis()));
        return v;
    }

    private static RemoteViews matchViews(Context ctx, Match m) {
        RemoteViews v = baseViews(ctx);
        v.setViewVisibility(R.id.wb_content, View.VISIBLE);
        v.setViewVisibility(R.id.wb_msg, View.GONE);

        String lg = LEAGUES.containsKey(m.league) ? LEAGUES.get(m.league) : "Maç";
        v.setTextViewText(R.id.wb_league, lg);

        boolean live = "in".equals(m.state);
        boolean pre = "pre".equals(m.state) || m.home.score == null;
        String status;
        if ("STATUS_POSTPONED".equals(m.stateName)) status = "Ertelendi";
        else if ("STATUS_CANCELED".equals(m.stateName) || "STATUS_ABANDONED".equals(m.stateName)) status = "İptal";
        else if (live) {
            if ("STATUS_HALFTIME".equals(m.stateName) || "HT".equalsIgnoreCase(m.detail)) status = "● Devre arası";
            else status = "● " + (m.clock.isEmpty() ? "Canlı" : m.clock.replace("'", "") + "'");
        } else if ("pre".equals(m.state)) status = dayLabel(m.time);
        else status = "Maç sonu" + (isToday(m.time) ? "" : " · " + shortDate(m.time));
        v.setTextViewText(R.id.wb_status, status);
        v.setTextColor(R.id.wb_status, live ? 0xFFEF4444 : 0xFF8A9AB3);

        v.setTextViewText(R.id.wb_score, pre && !live ? hm(m.time) : m.home.score + " - " + m.away.score);
        v.setTextColor(R.id.wb_score, live ? 0xFF22C55E : 0xFFEAF1FB);
        v.setTextViewTextSize(R.id.wb_score, TypedValue.COMPLEX_UNIT_SP, pre && !live ? 22f : 28f);

        v.setTextViewText(R.id.wb_home_name, m.home.name);
        v.setTextViewText(R.id.wb_away_name, m.away.name);
        boolean done = "post".equals(m.state);
        v.setTextColor(R.id.wb_home_name, done && m.away.winner ? 0xFF8A9AB3 : 0xFFEAF1FB);
        v.setTextColor(R.id.wb_away_name, done && m.home.winner ? 0xFF8A9AB3 : 0xFFEAF1FB);

        Bitmap hb = logo(ctx, m.home), ab = logo(ctx, m.away);
        if (hb != null) v.setImageViewBitmap(R.id.wb_home_logo, hb); else v.setImageViewResource(R.id.wb_home_logo, R.mipmap.ic_launcher);
        if (ab != null) v.setImageViewBitmap(R.id.wb_away_logo, ab); else v.setImageViewResource(R.id.wb_away_logo, R.mipmap.ic_launcher);

        v.setTextViewText(R.id.wb_updated, "Güncellendi " + hm(System.currentTimeMillis()));
        return v;
    }

    private static void push(Context ctx, AppWidgetManager mgr, int[] ids, RemoteViews v) {
        mgr.updateAppWidget(ids, v);
    }

    /** Canlı maçta yaklaşık her dakika, maç yaklaşırken başlama saatinde yenile. */
    private static void scheduleNext(Context ctx, Match m) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        PendingIntent pi = refreshIntent(ctx, 2);
        long now = System.currentTimeMillis();
        long at = 0;
        if ("in".equals(m.state)) at = now + 60000L;
        else if ("pre".equals(m.state) && m.time - now < 6 * 3600000L) at = Math.max(now + 60000L, m.time + 60000L);
        if (at > 0) am.set(AlarmManager.RTC, at, pi);
        else am.cancel(pi);
    }

    private static String hm(long t) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(t);
        return String.format(Locale.US, "%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE));
    }

    private static boolean isToday(long t) { return sameDay(t, System.currentTimeMillis()); }

    private static boolean sameDay(long a, long b) {
        Calendar x = Calendar.getInstance(), y = Calendar.getInstance();
        x.setTimeInMillis(a); y.setTimeInMillis(b);
        return x.get(Calendar.YEAR) == y.get(Calendar.YEAR) && x.get(Calendar.DAY_OF_YEAR) == y.get(Calendar.DAY_OF_YEAR);
    }

    private static String shortDate(long t) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(t);
        return c.get(Calendar.DAY_OF_MONTH) + " " + AY[c.get(Calendar.MONTH)];
    }

    private static String dayLabel(long t) {
        long now = System.currentTimeMillis();
        if (sameDay(t, now)) return "Bugün";
        if (sameDay(t, now + 86400000L)) return "Yarın";
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(t);
        return shortDate(t) + " " + GUN[c.get(Calendar.DAY_OF_WEEK) - 1];
    }
}
