import pandas as pd
import numpy as np
import streamlit as st

st.set_page_config(page_title="NBA Game Predictor", layout="centered")

# ---------------------------
# 1️⃣  Google Sheet CSV links
# ---------------------------
STATS_URL = "https://docs.google.com/spreadsheets/d/your_stats_sheet_id/export?format=csv"
LINEUPS_URL = "https://docs.google.com/spreadsheets/d/your_lineups_sheet_id/export?format=csv"

# ---------------------------
# 2️⃣  Column letters
# ---------------------------
STATS_PLAYER_COL = "B"
STATS_TEAM_COL   = "A"
STATS_GAMES_COL  = "F"
STATS_MP_COL     = "H"
STATS_PER_COL    = "I"
STATS_USG_COL    = "T"

LINEUPS_TEAM_COL = "A"
LINEUPS_G1_COL   = "B"
LINEUPS_G2_COL   = "C"
LINEUPS_F1_COL   = "D"
LINEUPS_F2_COL   = "E"
LINEUPS_C_COL    = "F"

# ---------------------------
# 3️⃣  Helper functions
# ---------------------------
def col_letter_to_idx(letter):
    letter = letter.strip().upper()
    val = 0
    for ch in letter:
        val = val * 26 + (ord(ch) - ord("A") + 1)
    return val - 1

def series_by_letter(df, letter):
    return df.iloc[:, col_letter_to_idx(letter)]

def minutes_per_game(total_minutes, games):
    try:
        g = float(games) if pd.notna(games) else 0
        mp = float(total_minutes) if pd.notna(total_minutes) else 0
        return mp / g if g > 0 else np.nan
    except Exception:
        return np.nan

def usage_adjusted_per(per, usg, league_usage=20.0, cap_low=0.6, cap_high=1.4):
    if pd.isna(per) or pd.isna(usg):
        return np.nan
    scale = np.clip(usg / league_usage, cap_low, cap_high)
    return per * scale

def lineup_weighted_per(player_names, stats_df, cols):
    s_player = series_by_letter(stats_df, cols["player"]).astype(str).str.strip()
    s_per    = pd.to_numeric(series_by_letter(stats_df, cols["per"]), errors="coerce")
    s_usg    = pd.to_numeric(series_by_letter(stats_df, cols["usg"]), errors="coerce")
    s_mpg    = pd.to_numeric(stats_df["__MPG__"], errors="coerce")

    rows = []
    for name in player_names:
        name = (name or "").strip()
        if not name:
            continue
        mask = s_player == name
        if not mask.any():
            continue
        per  = float(s_per[mask].iloc[0])
        usg  = float(s_usg[mask].iloc[0])
        mpg  = float(s_mpg[mask].iloc[0])
        adj_per = usage_adjusted_per(per, usg)
        rows.append((adj_per, mpg))

    if not rows:
        return np.nan
    per_min_sum = sum(p * m for p, m in rows)
    min_sum = sum(m for _, m in rows)
    return per_min_sum / min_sum if min_sum else np.nan

# ---------------------------
# 4️⃣  Load data
# ---------------------------
@st.cache_data
def load_data():
    stats_df = pd.read_csv(STATS_URL)
    lineups_df = pd.read_csv(LINEUPS_URL)
    return stats_df, lineups_df

stats_df, lineups_df = load_data()

# Compute MPG
s_games = pd.to_numeric(series_by_letter(stats_df, STATS_GAMES_COL), errors="coerce")
s_mp = pd.to_numeric(series_by_letter(stats_df, STATS_MP_COL), errors="coerce")
stats_df["__MPG__"] = [minutes_per_game(m, g) for m, g in zip(s_mp, s_games)]

# ---------------------------
# 5️⃣  Build team PER scores
# ---------------------------
cols = {
    "player": STATS_PLAYER_COL,
    "team": STATS_TEAM_COL,
    "g": STATS_GAMES_COL,
    "mp": STATS_MP_COL,
    "per": STATS_PER_COL,
    "usg": STATS_USG_COL,
    "mpg": "__MPG__"
}

teams = series_by_letter(lineups_df, LINEUPS_TEAM_COL).astype(str).str.strip()
pos_cols = [LINEUPS_G1_COL, LINEUPS_G2_COL, LINEUPS_F1_COL, LINEUPS_F2_COL, LINEUPS_C_COL]

def lineup_from_row(df, row_idx, letters):
    vals = []
    for L in letters:
        vals.append(str(df.iloc[row_idx, col_letter_to_idx(L)]) if pd.notna(df.iloc[row_idx, col_letter_to_idx(L)]) else "")
    return vals

team_scores = {}
for i, team in enumerate(teams):
    lineup = lineup_from_row(lineups_df, i, pos_cols)
    per_val = lineup_weighted_per(lineup, stats_df, cols)
    team_scores[team] = per_val

# ---------------------------
# 6️⃣  Prediction Interface
# ---------------------------
st.title("🏀 NBA Game Predictor")

team_list = sorted(list(team_scores.keys()))
col1, col2 = st.columns(2)
away_team = col1.selectbox("Away Team", team_list)
home_team = col2.selectbox("Home Team", team_list)

col3, col4 = st.columns(2)
book_spread = col3.number_input("Book Spread (Home = -)", value=-3.5)
book_total = col4.number_input("Book Total", value=225.0)

if away_team and home_team:
    away_per = team_scores.get(away_team, 15)
    home_per = team_scores.get(home_team, 15)

    # Predict scores
    # Use PER differential scaled to NBA scoring range
    league_ppg = 114  # base league avg
    per_diff = away_per - home_per

    away_pred = league_ppg/2 + (per_diff * 1.5)
    home_pred = league_ppg/2 - (per_diff * 1.5)

    model_total = away_pred + home_pred
    model_spread = home_pred - away_pred

    # Win probability (based on logistic spread gap)
    prob_home = 1 / (1 + np.exp(-model_spread / 6))
    prob_away = 1 - prob_home

    winner = home_team if home_pred > away_pred else away_team

    # Total recommendation
    if model_total > book_total + 4:
        total_play = "BET OVER"
    elif model_total < book_total - 4:
        total_play = "BET UNDER"
    else:
        total_play = "NO BET"

    # Spread recommendation
    if model_spread > book_spread + 2:
        spread_play = f"BET {home_team}"
    elif model_spread < book_spread - 2:
        spread_play = f"BET {away_team}"
    else:
        spread_play = "NO BET"

    # ---------------------------
    # Display results
    # ---------------------------
    st.markdown("---")
    st.subheader("📊 Game Prediction Results")

    st.markdown(
        f"""
        **{away_team}**: {away_pred:.1f}  
        **{home_team}**: {home_pred:.1f}  
        ---
        **Predicted Winner:** {winner}  
        **Win Probability:**  
        - {away_team}: {prob_away*100:.1f}%  
        - {home_team}: {prob_home*100:.1f}%  
        ---
        **Model Total:** {model_total:.1f} vs Book Total {book_total}  
        **Total Play:** {total_play}  
        ---
        **Model Spread:** {model_spread:+.1f} vs Book Spread {book_spread:+.1f}  
        **Spread Play:** {spread_play}
        """
    )
