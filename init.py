import sqlite3
from taxiLocations import locations

# init database
def initDatabase():
    con = sqlite3.connect("database.db")
    cur = con.cursor()
    cur.execute("BEGIN TRANSACTION") # wrap all the initialization in a single transaction

    for skey in locations.keys():
        for gkey in locations.keys():
            if skey == gkey:
                continue
            tableFare = []
            for i in range(48):
                tableFare.append((skey, gkey, i, 0, "2024-01-01T12:00:00")) # 2024-01-01T12:00:00 is a dummy value for inducing initial update
            cur.executemany("INSERT INTO taxiFare (start, goal, time, fare, lastUpdate) VALUES(?,?,?,?,?)", tableFare)

    cur.execute("END TRANSACTION")
    con.commit()
    con.close()
    return True