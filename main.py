from fastapi import FastAPI
from dotenv import load_dotenv
import os
import json
import aiohttp
import asyncio
import datetime
import sqlite3
from taxiLocations import locations

# load env
load_dotenv(verbose=True)
API_KEYS = {"X-NCP-APIGW-API-KEY-ID":os.getenv("NAVER_MAP_API_ID"), 
"X-NCP-APIGW-API-KEY":os.getenv("NAVER_MAP_API_KEY")}


# KST timezone setting
timezone_kst = datetime.timezone(datetime.timedelta(hours = 9))

# FastAPI
app = FastAPI()

# check database
def checkDatabase(start, goal, time, currentDate):
    con = sqlite3.connect("database.db")
    cur = con.cursor()
    cur.execute("SELECT fare, lastUpdate FROM taxiFare WHERE start=? AND goal=? AND time=?", (start, goal, time))
    result = cur.fetchone()

    # check if the last update is within 24 hours
    # if not, return -1
    lastUpdateTime = datetime.datetime.strptime(result[5], "%Y-%m-%dT%H:%M:%S")
    if (currentDate-lastUpdateTime) > datetime.timedelta(hours=24):
        con.close()
        return -1
    else:
        result = result[4]
        con.close()
        return result

# update database
def updateDatabase(start, goal, time, fare, lastUpdate):
    lastUpdateTime = datetime.datetime.strptime(lastUpdate, "%Y-%m-%dT%H:%M:%S")
    con = sqlite3.connect("database.db")
    cur = con.cursor()
    try:
        cur.execute("UPDATE taxiFare SET fare=?, lastUpdate=? WHERE start=? AND goal=? AND time=?", (fare,lastUpdateTime, start, goal,time ))
        con.commit()
    except sqlite3.Error as e:
        print(e)
    con.close()

# scale time
# datetime %Y-%m-%dT%H:%M:%S to 0-47 (devided by 30 min)
def scaleTime(time):
    time = datetime.datetime.strptime(time, "%Y-%m-%dT%H:%M:%S")
    sTime = time.hour *2+time.minute//30
    return sTime

# async API call
async def getTaxiFare(url, apiKeys):
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=apiKeys) as resp:
            if resp.status == 200:
                rsp = json.loads(await resp.text())
                return rsp.get("route").get("traoptimal")[0].get("summary").get("taxiFare")
            else:
                return "Fail with code "+resp.status+"."

# fare main
@app.post("/fare/{start}/{goal}/{time}")
async def fare(start:str, goal:str, time: str):
    try: 
        start = locations[start]
        goal = locations[goal]
        currentDate = datetime.datetime.now().astimezone(timezone_kst)

        # time to scale 0-47 (devided by 30 min)
        sTime = scaleTime(time)

        # check the database first
        # last update check
        # if last update is within 24 hours, return the fare
        result = checkDatabase(start, goal, sTime, currentDate)
        if(result > 0):
            return result
        else:
            result = 10000
            result = asyncio.run(getTaxiFare(
                "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start="+start+"&goal="+goal+"&options=traoptimal", API_KEYS))

            # sqlite update the fare
            updateDatabase(start, goal, sTime, result, currentDate)
            return result

    except Exception as e:
        print(e)
        return "Fail with exception "+e+"."
