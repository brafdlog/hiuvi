import React, { useState } from "react";
import NavBar from "react-bootstrap/Navbar";
import { Container, Stack } from "react-bootstrap";
import logo from "../../assets/logoFishOnly.svg";
import { openExternal } from "../../eventsBridge";
import { repository } from "../../../package.json";
import { discordchannel } from "../../../package.json";
import NavButton from "./NavButton";
import styles from "./TopBar.module.css";
import ReportProblemModal from "./ReportProblemModal";
import Image from "react-bootstrap/Image";

function TopBar() {
  const [show, setShow] = useState(false);

  return (
    <>
      <NavBar
        className={styles.topNavBar}
        style={{ borderBottom: "1px solid #C4C4C4" }}
      >
        <Container fluid>
          <NavBar.Brand>
            <Image
              src={logo}
              alt="כספיון"
              width={50}
              height={50}
              roundedCircle
            />{" "}
            כספיון
          </NavBar.Brand>
          <Stack direction="horizontal" gap={5}>
            <NavButton onClick={() => setShow(true)} text="דיווח על בעיה" />
            <NavButton
              onClick={() => openExternal(discordchannel)}
              text="ערוץ הדיסקורד שלנו"
            />
            <NavButton
              onClick={() => openExternal(repository)}
              text="לפתוח ב-Github"
            />
          </Stack>
        </Container>
      </NavBar>
      <ReportProblemModal show={show} onClose={() => setShow(false)} />
    </>
  );
}

export default TopBar;
