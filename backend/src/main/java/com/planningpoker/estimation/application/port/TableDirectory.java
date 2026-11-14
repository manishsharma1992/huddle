package com.planningpoker.estimation.application.port;

import com.planningpoker.estimation.application.view.TableSummaryView;

import java.time.Instant;
import java.util.List;

/** Read-side query: which tables were active recently, so colleagues on the LAN can find them. */
public interface TableDirectory {
    List<TableSummaryView> activeSince(Instant since, int limit);
}
