package com.planningpoker.estimation.infrastructure.persistence;

import com.planningpoker.estimation.application.port.TableDirectory;
import com.planningpoker.estimation.application.view.TableSummaryView;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

/** Read-side query straight from the tables (no aggregate needed to list tables). */
@Component
class JdbcTableDirectory implements TableDirectory {

    private final JdbcClient jdbc;

    JdbcTableDirectory(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<TableSummaryView> activeSince(Instant since, int limit) {
        return jdbc.sql("""
                        select s.code, s.name, s.updated_at,
                               (select count(*) from participant p where p.session_id = s.id) as people
                          from poker_session s
                         where s.updated_at > :since
                         order by s.updated_at desc
                         limit :limit""")
                .param("since", Timestamp.from(since))
                .param("limit", limit)
                .query((rs, row) -> new TableSummaryView(rs.getString("code"), rs.getString("name"),
                        rs.getInt("people"), rs.getTimestamp("updated_at").toInstant().toEpochMilli()))
                .list();
    }
}
