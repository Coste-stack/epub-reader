import { IoClose } from "react-icons/io5";
import { IoSettingsOutline } from "react-icons/io5";
import { IoCloudUploadOutline } from "react-icons/io5";
import { IoCloudDownloadOutline } from "react-icons/io5";

type ButtonProps = {
  handleClick: () => void;
}

type ButtonWrapperProps = {
  Icon: React.ElementType;
} & ButtonProps;

const ButtonWrapper: React.FC<ButtonWrapperProps> = ({ handleClick, Icon }) => (
  <div 
    className="interactable"
    onClick={handleClick}
  >
    <Icon />
  </div>
)

export const CloseButton: React.FC<ButtonProps> = ({ handleClick }) => (
  <ButtonWrapper handleClick={handleClick} Icon={IoClose} />
)

export const SettingsButton: React.FC<ButtonProps> = ({ handleClick }) => (
  <ButtonWrapper handleClick={handleClick} Icon={IoSettingsOutline} />
)

export const UploadButton: React.FC<ButtonProps> = ({ handleClick }) => (
  <ButtonWrapper handleClick={handleClick} Icon={IoCloudUploadOutline} />
)

export const DownloadButton: React.FC<ButtonProps> = ({ handleClick }) => (
  <ButtonWrapper handleClick={handleClick} Icon={IoCloudDownloadOutline} />
)