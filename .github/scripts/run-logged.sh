#!/usr/bin/env bash
# Run a command with its output in a regular file, then print that file.
#
# Vite Task forwards task output to its own stdout. When that stdout is a
# pipe, the Node processes it spawns for tasks set O_NONBLOCK on the shared
# file description for as long as they run (Node does this to every pipe it
# touches; vp clears it at startup but cannot stop its children re-setting
# it). A large burst of forwarded output while such a child is alive then
# fills the pipe and the write fails with
#   "Failed to forward task process output: Resource temporarily unavailable
#   (os error 11)"
# which Vite Task records as a failed task even though the task finished.
# Node only makes pipes non-blocking, and writes to a regular file never
# return EAGAIN, so route the output through a file and replay it afterwards.
#
# Usage: run-logged.sh <log-name> <command> [args...]
set -u

name=$1
shift
log="${RUNNER_TEMP:-/tmp}/${name}.log"

"$@" >"$log" 2>&1
status=$?

cat "$log"
exit "$status"
