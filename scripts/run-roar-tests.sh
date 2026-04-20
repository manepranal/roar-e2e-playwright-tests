#!/usr/bin/env bash
# =============================================================================
# ROAR E2E Interactive Test Runner
# Prompts for: environment, call direction, agent/broker persona, scenario, mode
# =============================================================================

set -e

BOLD=$(tput bold 2>/dev/null || echo '')
RESET=$(tput sgr0 2>/dev/null || echo '')
GREEN=$(tput setaf 2 2>/dev/null || echo '')
CYAN=$(tput setaf 6 2>/dev/null || echo '')

prompt() { read -r -p "${BOLD}$1${RESET} " REPLY; echo "$REPLY"; }

echo ""
echo "${BOLD}${CYAN}==================================="
echo "   ROAR E2E Interactive Runner"
echo "===================================${RESET}"
echo ""

# ---------------------------------------------------------------------------
# 1. ENVIRONMENT
# ---------------------------------------------------------------------------
echo "${BOLD}Which environment?${RESET}"
echo "  1) team1  — https://bolt.team1realbrokerage.com"
echo "  2) team2  — https://bolt.team2realbrokerage.com"
echo "  3) local  — http://localhost:3003"
echo "  4) custom — enter your own URL"
ENV_CHOICE=$(prompt "Select [1-4]:")

case $ENV_CHOICE in
  1) BASE_URL="https://bolt.team1realbrokerage.com"; PW_CONFIG="playwright.team1.config.ts" ;;
  2) BASE_URL="https://bolt.team2realbrokerage.com"; PW_CONFIG="playwright.team2.config.ts" ;;
  3) BASE_URL="http://localhost:3003";               PW_CONFIG="playwright.config.ts" ;;
  4) BASE_URL=$(prompt "Enter base URL:");           PW_CONFIG="playwright.config.ts" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

export REACT_APP_HOST_URL="$BASE_URL"
echo "  → ${GREEN}${BASE_URL}${RESET}"
echo ""

# ---------------------------------------------------------------------------
# 2. CALL DIRECTION
# ---------------------------------------------------------------------------
echo "${BOLD}Who is making the call?${RESET}"
echo "  1) Agent  → calls Broker Team  (from transaction page)"
echo "  2) Broker → calls Agent        (on a transaction)"
DIR_CHOICE=$(prompt "Select [1-2]:")

case $DIR_CHOICE in
  1) DIRECTION="agent" ;;
  2) DIRECTION="broker" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac
echo "  → ${GREEN}${DIRECTION^} flow${RESET}"
echo ""

# ---------------------------------------------------------------------------
# 3. PERSONA
# ---------------------------------------------------------------------------
if [ "$DIRECTION" = "agent" ]; then
  echo "${BOLD}Which agent?${RESET}"
  echo "  1) US Agent"
  echo "  2) CA Agent"
  echo "  3) Both"
  PERSONA_CHOICE=$(prompt "Select [1-3]:")
  case $PERSONA_CHOICE in
    1) PERSONA_GREP="as Us Agent" ;;
    2) PERSONA_GREP="as Ca Agent" ;;
    3) PERSONA_GREP="" ;;
    *) echo "Invalid choice"; exit 1 ;;
  esac
  echo "  → ${GREEN}${PERSONA_GREP:-Both personas}${RESET}"
else
  echo "${BOLD}Which broker?${RESET}"
  echo "  1) US Broker"
  echo "  2) CA Broker"
  echo "  3) Both"
  PERSONA_CHOICE=$(prompt "Select [1-3]:")
  case $PERSONA_CHOICE in
    1) PERSONA_GREP="as Us Broker" ;;
    2) PERSONA_GREP="as Ca Broker" ;;
    3) PERSONA_GREP="" ;;
    *) echo "Invalid choice"; exit 1 ;;
  esac
  echo "  → ${GREEN}${PERSONA_GREP:-Both personas}${RESET}"
fi
echo ""

# ---------------------------------------------------------------------------
# 4. SCENARIO
# ---------------------------------------------------------------------------
if [ "$DIRECTION" = "agent" ]; then
  echo "${BOLD}Which test scenario?${RESET}"
  echo "  1) Opens broker support panel (panel renders + intro text)"
  echo "  2) Full flow: submit question + connect with broker"
  echo "  3) Both scenarios"
  SCENARIO_CHOICE=$(prompt "Select [1-3]:")
  case $SCENARIO_CHOICE in
    1) SCENARIO_GREP="opens broker support panel" ;;
    2) SCENARIO_GREP="can submit a broker question" ;;
    3) SCENARIO_GREP="" ;;
    *) echo "Invalid choice"; exit 1 ;;
  esac
else
  echo "${BOLD}Which test scenario?${RESET}"
  echo "  1) Call agent from transaction (full call flow)"
  echo "  2) All broker ROAR scenarios"
  SCENARIO_CHOICE=$(prompt "Select [1-2]:")
  case $SCENARIO_CHOICE in
    1) SCENARIO_GREP="call agent" ;;
    2) SCENARIO_GREP="" ;;
    *) echo "Invalid choice"; exit 1 ;;
  esac
fi
echo "  → ${GREEN}${SCENARIO_GREP:-All scenarios}${RESET}"
echo ""

# ---------------------------------------------------------------------------
# 5. RUN MODE
# ---------------------------------------------------------------------------
echo "${BOLD}Run mode?${RESET}"
echo "  1) Headless  (fast, no browser window)"
echo "  2) Headed    (opens browser — good for debugging)"
MODE_CHOICE=$(prompt "Select [1-2]:")
HEADED_FLAG=""
[ "$MODE_CHOICE" = "2" ] && HEADED_FLAG="--headed"
echo "  → ${GREEN}${HEADED_FLAG:+Headed}${HEADED_FLAG:-Headless}${RESET}"
echo ""

# ---------------------------------------------------------------------------
# BUILD TEST FILE PATH
# ---------------------------------------------------------------------------
if [ "$DIRECTION" = "agent" ]; then
  TEST_FILE="playwright/aa_roar/agent/call-broker-team-from-transaction.spec.ts"
else
  TEST_FILE="playwright/aa_roar/broker/call-agent.spec.ts"
fi

# Build --grep expression (combine persona + scenario)
if [ -n "$PERSONA_GREP" ] && [ -n "$SCENARIO_GREP" ]; then
  GREP_PATTERN="${PERSONA_GREP}.*${SCENARIO_GREP}"
elif [ -n "$PERSONA_GREP" ]; then
  GREP_PATTERN="$PERSONA_GREP"
elif [ -n "$SCENARIO_GREP" ]; then
  GREP_PATTERN="$SCENARIO_GREP"
else
  GREP_PATTERN="@roar"
fi

CMD="npx playwright test $TEST_FILE --config $PW_CONFIG --reporter=list --grep \"$GREP_PATTERN\""
[ -n "$HEADED_FLAG" ] && CMD="$CMD $HEADED_FLAG"

# ---------------------------------------------------------------------------
# SUMMARY & RUN
# ---------------------------------------------------------------------------
echo "${BOLD}═══════════════════════════════════"
echo " Running:"
echo "   Env      : $BASE_URL"
echo "   Direction: ${DIRECTION^} → ${DIRECTION/agent/Broker Team}"
echo "   Persona  : ${PERSONA_GREP:-Both}"
echo "   Scenario : ${SCENARIO_GREP:-All}"
echo "   Mode     : ${HEADED_FLAG:+Headed}${HEADED_FLAG:-Headless}"
echo "═══════════════════════════════════${RESET}"
echo ""
echo "$ $CMD"
echo ""

eval $CMD
