import React, { useState, useEffect } from 'react';
import axios from 'axios';
const Profiles = () => {
  console.log("Logging from Profiles component"); 
  
 
  const [profiles, setProfiles] = useState([]);
  const [tickers, setTickers] = useState([]);
  const fetchProfiles = async () => {
    try {
      const response = await axios.get('http://localhost:8080/profile');
      setProfiles(response.data);
    } catch (error) {
      console.error(error);
      alert('Cannot fetch profiles');
    }
  };
  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    const parseTickerSymbols = (data) => {
      const tickerSymbols = [];
      const rows = data.split('\n');
      const headers = rows[0].split(',');
      const symbolIndex = headers.indexOf('symbol');
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].split(',');
        if (row.length > symbolIndex) {
          const ticker = row[symbolIndex].trim();
          tickerSymbols.push(ticker);
        }
      }
    
      return tickerSymbols;
    };
    const fetchTickers = async () => {
      try {
        const response = await axios.get(
          'https://www.alphavantage.co/query?function=LISTING_STATUS&state=active&apikey= 47N9UD8M7YMFVEO1'
        );
        const tickerSymbols = parseTickerSymbols(response.data);
        setTickers(tickerSymbols);
      } catch (error) {
        console.error(error);
        alert('Cannot fetch tickers');
      }
    };
    fetchTickers();
  }, []);

 
  const createProfile = async () => {
    try {
      const newProfileId = generateUniqueId();
      const newProfile = {
        id: newProfileId,
        data: {
          ticker: ''
        }
      };
      await axios.post('http://localhost:8080/profile', newProfile);
      fetchProfiles();
    } catch (error) {
      console.error(error);
      alert('Error creating profile. Please try again.');
    }
  };
  const deleteProfile = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/profile/${id}`);
      fetchProfiles();
    } catch (error) {
      console.error(error);
      alert('Error deleting profile. Please try again.');
    }
  };
  const callPythonAPI = async (request) => {
    try {
      const jsonRequest = JSON.stringify(request);
      return axios.post('http://localhost:5000/api/main', jsonRequest, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error calling Python API:', error);
    }
  };
  const updateTicker = async (id, ticker) => {
    try {
      const profileToUpdate = profiles.find((profile) => profile.id === id);
      const request={
        company_name:ticker,
        predict:false
      }
      
      const response=await callPythonAPI(request);
      profileToUpdate.data.ticker = ticker;
      profileToUpdate.data.plot = response.data.plot;
      profileToUpdate.data.risk_output = response.data.risk_output;
      await axios.put(`http://localhost:8080/profile`, profileToUpdate);
      await fetchProfiles();
    } catch (error) {
      console.error(error);
      alert('Error updating ticker. Please try again.');
    }
  };

  const generateUniqueId = () => {
    if (profiles.length === 0) {
      return 1;
    }

    const maxId = Math.max(...profiles.map((profile) => profile.id));
    return maxId >= 1 ? maxId + 1 : 1;
  };

  return (
    <div>
      <h2>Profiles</h2>
      <button onClick={createProfile}>Create Profile</button>
      {profiles.length > 0 ? (
        profiles.map((profile) => (
          <div key={profile.id}>
            <p>ID: {profile.id}</p>
            {/* Display other profile properties */}
            {profile.data.ticker ? (
              <p>Ticker: {profile.data.ticker}</p>
            ) : (
              <select
                value={profile.data.ticker}
                onChange={(e) => updateTicker(profile.id, e.target.value)}
              >
                <option value="">Select a ticker</option>
                {tickers.map((ticker) => (
                  <option key={ticker} value={ticker}>
                    {ticker}
                  </option>
                ))}
              </select>
            )}
            <button onClick={() => deleteProfile(profile.id)}>Delete</button>
          </div>
        ))
      ) : (
        <p>No profiles found.</p>
      )}
    </div>
  );
};

export default Profiles;