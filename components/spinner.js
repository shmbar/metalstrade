import PropagateLoader from "react-spinners/PropagateLoader";

const Spinner = () => {
    return (
        <div className="sweet-loading absolute z-50 justify-center flex w-full items-center place-content-center h-screen">

            <PropagateLoader
                color="rgba(35, 46, 43, 0.44)"
                cssOverride={{}}
                loading={true}

                size={25}
                aria-label="Loading Spinner"
                data-testid="loader"
            />
        </div>
    );
}

export default Spinner