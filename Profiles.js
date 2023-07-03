import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

const Profiles = () => {
  console.log("Logging from Profiles component");
  const [profiles, setProfiles] = useState([]);
  const [tickers, setTickers] = useState([]);

  // Fetch profiles on component mount
  useEffect(() => {
    fetchProfiles();
  }, []);
  useEffect(() => {
    localStorage.setItem('tickers', JSON.stringify(tickers));
  }, [tickers]);
  // Fetch tickers on component mount
  useEffect(() => {
      // Parse ticker symbols from AlphaVantage response
  const parseTickerSymbols = async(data) => {
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

  // Fetch tickers from AlphaVantage API
  const fetchTickers = async () => {
    try {
      const response = await axios.get(
        'https://www.alphavantage.co/query?function=LISTING_STATUS&state=active&apikey=47N9UD8M7YMFVEO1'
      );
      if(typeof(response.data)!='string'){
        alert('Aplha Vantage not responding please wait');
        return;
      }
      else
        console.log(typeof(response.data))
      const tickerSymbols = await parseTickerSymbols(response.data);
      setTickers(tickerSymbols);
    } catch (error) {
      console.error(error);
      alert('Cannot fetch tickers');
    }
  };

  const cachedTickers = localStorage.getItem('tickers');
  if (cachedTickers) {
    const parsedTickers = JSON.parse(cachedTickers);
    if (parsedTickers.length === 0) {
        fetchTickers();
    } else {
      setTickers(parsedTickers);
    }
  } 
  else {
    	fetchTickers();
  }

  }, []);

  // Fetch profiles from API
  const fetchProfiles = async () => {
    try {
      const response = await axios.get('http://localhost:8080/profile');
      if (response.data ) {
        const updatedProfiles = response.data.map((profile) => ({
          ...profile,
          data: {
            ...profile.data,
            isAIPlotVisible: profile.data.isAIPlotVisible !== undefined ? profile.data.isAIPlotVisible : false,
            isLoading: profile.isLoading!==undefined?profile.isLoading:false,
          },
        }));
        setProfiles(updatedProfiles);
      } 
      else {
        setProfiles([]);
      }
    } catch (error) {
      console.error(error);
      alert('Cannot fetch profiles');
    }
  };
  


  // Create a new profile
  const createProfile = async () => {
    try {
      const newProfileId = generateUniqueId();
      const newProfile = {
        id: newProfileId,
        data: {
          ticker: '',
        },
      };
      await axios.post('http://localhost:8080/profile', newProfile);
      fetchProfiles();
    } catch (error) {
      console.error(error);
      alert('Error creating profile. Please try again.');
    }
  };

  // Delete a profile
  const deleteProfile = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/profile/${id}`);
      fetchProfiles();
    } catch (error) {
      console.error(error);
      alert('Error deleting profile. Please try again.');
    }
  };

  // Call Python API
  const callPythonAPI = async (request) => {
    try {
      const jsonRequest = JSON.stringify(request);
      return axios.post('http://localhost:5000/api/main', jsonRequest, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error calling Python API:', error);
    }
  };

  // Update ticker and fetch updated data
  const updateTicker = async (id, ticker) => {
    try {
      const profileToUpdate = profiles.find((profile) => profile.id === id);
      const request = {
        company_name: ticker,
        predict: false,
      };

      const response = await callPythonAPI(request);
      profileToUpdate.data.ticker = ticker;
      profileToUpdate.data.plot = response.data.plot;
      profileToUpdate.data.risk_output = response.data.risk_output;
      profileToUpdate.data.isAIPlotVisible=false;
      await axios.put(`http://localhost:8080/profile`, profileToUpdate);
      await fetchProfiles();
    } catch (error) {
      console.error(error);
      alert('Error updating ticker. Please try again.');
    }
  };

  // Parse plot data from string to JSON object
  const parsePlotData = (plotData) => {
    try {
      if (!plotData) {
        return null;
      }
      const parsedData = JSON.parse(plotData);
      if (parsedData && typeof parsedData === 'object' && 'data' in parsedData && 'layout' in parsedData) {
        //console.log('Parsed plot data:', parsedData);
        return parsedData.data;
      } else {
        console.error('Invalid plot data format. Expected an object with "data" and "layout" properties.');
      }
    } catch (error) {
      console.error('Error parsing plot data:', error);
    }
    return null; 
  };

  // Generate a unique ID for new profiles
  const generateUniqueId = () => {
    if (profiles.length === 0) {
      return 1;
    }

    const maxId = Math.max(...profiles.map((profile) => profile.id));
    return maxId >= 1 ? maxId + 1 : 1;
  };

  // Call Python API with predict set to true
  const predictAndPlot = async (id,data) => {
    try {
      setProfiles((prevProfiles) =>
      prevProfiles.map((profile) =>
        profile.id === id ? { ...profile, isLoading: true } : profile
      )
      );
      const profileToUpdate = profiles.find((profile) => profile.id === id);
      const request = {
        company_name: profileToUpdate.data.ticker,
        predict: true,
      };

      const response = await callPythonAPI(request);
      profileToUpdate.data =data;
      profileToUpdate.data.predictive_plot=response.data.plot;
      profileToUpdate.data.risk_output = response.data.risk_output;
      profileToUpdate.data.isAIPlotVisible=true;
      await axios.put(`http://localhost:8080/profile`, profileToUpdate);
      await fetchProfiles();
      setProfiles((prevProfiles) =>
      prevProfiles.map((profile) =>
        profile.id === id ? { ...profile, isLoading: false } : profile
      )
    );
    } catch (error) {
      console.error(error);
      setProfiles((prevProfiles) =>
      prevProfiles.map((profile) =>
        profile.id === id ? { ...profile, isLoading: false } : profile
      )
    );
      alert('Error predicting and plotting. Please try again.');
    }
  };
// Toggle AI plot visibility for a profile
const toggleAIPlotVisibility = (id) => {
  setProfiles((prevProfiles) =>
    prevProfiles.map((profile) =>
      profile.id === id ? { ...profile, isAIPlotVisible: !profile.isAIPlotVisible } : profile
    )
  );
};
const getColorCode = (risk) => {
  if (risk === 'high') {
    return 'red';
  } else if (risk === 'moderate') {
    return 'orange';
  } else if (risk === 'low') {
    return 'green';
  } else {
    return 'black';
  }
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
            <>
              <p>Ticker: {profile.data.ticker}</p>
              {profile.isLoading?(<p>Loading AI plot....</p>):(
                <>
                  {/* <button onClick={() => predictAndPlot(profile.id)}>Predict and Plot</button> */}
                  <button onClick={() => toggleAIPlotVisibility(profile.id)}>
                    {profile.isAIPlotVisible ? 'Show Original Plot' : 'Show AI Plot'}
                  </button>
                  {!profile.isAIPlotVisible && profile.data.plot && (
                    <Plot data={parsePlotData(profile.data.plot)} layout={{ width: 1500, height: 500 }} />
                  )}
                  {profile.isAIPlotVisible && profile.data.predictive_plot && (
                    <Plot data={parsePlotData(profile.data.predictive_plot)} layout={{ width: 1500, height: 500 }} />
                  )}
                  {!profile.data.predictive_plot && profile.isAIPlotVisible && (
                    <button onClick={() => predictAndPlot(profile.id, profile.data)}>Generate AI plot</button>
                  )}
                  <div>
                    {/* Show risk output values with color codes */}
                    <p>Risk Output:</p>
                    <div>
                      <span style={{ color: getColorCode(profile.data.risk_output.risk_1_month) }}>
                        Short Term Risk <br/> {profile.data.risk_output.risk_1_month}
                        <br/>
                      </span>
                      <span style={{ color: getColorCode(profile.data.risk_output.risk_6_months) }}>
                        Medium Term Risk<br/> {profile.data.risk_output.risk_6_months}
                        <br/>
                      </span>
                      <span style={{ color: getColorCode(profile.data.risk_output.risk_24_months) }}>
                        Long Term Risk<br/> {profile.data.risk_output.risk_24_months}
                        <br/>
                      </span>
                    </div>
                  </div>
                </>
              )}
              
            </>
          ) : (
            <div>
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
            </div>
          )}
          <button onClick={() => deleteProfile(profile.id)}>Delete</button>
          <hr />
        </div>
      ))
    ) : (
      <p>No profiles found.</p>
    )}
  </div>
);

};

export default Profiles;
